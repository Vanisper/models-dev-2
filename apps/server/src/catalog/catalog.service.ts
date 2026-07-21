import { Injectable, OnModuleInit } from "@nestjs/common"
import { execFile } from "child_process"
import { readFile } from "fs/promises"
import * as path from "path"
import { promisify } from "util"
import { Catalog, LabEntry, ModelBenchmark, ModelCost, ModelEntry } from "./catalog.types"

const execFileAsync = promisify(execFile)
const DATA_DIR = process.env.DATA_DIR ?? path.resolve(__dirname, "../../../../data")
const ROOT_DIR = path.resolve(__dirname, "../../../..")
const DATA_SOURCE = process.env.DATA_SOURCE ?? (process.env.VERCEL ? "remote" : "local")

const REMOTE_URLS = {
  catalog: "https://models.dev/catalog.json",
  api: "https://models.dev/api.json",
  labs: "https://models.dev/labs",
}

@Injectable()
export class CatalogService implements OnModuleInit {
  private catalog: Catalog | undefined

  async onModuleInit() {
    await this.reload()
  }

  getCatalog(): Catalog {
    if (!this.catalog) throw new Error("catalog not loaded")
    return this.catalog
  }

  findModel(lab: string, slug: string): ModelEntry | undefined {
    const id = `${catalogLabSlug(lab)}/${catalogSlug(slug)}`
    return this.getCatalog().models.find((m) => m.id === id || catalogIdKey(m.id) === id)
  }

  async refresh() {
    if (DATA_SOURCE === "remote") {
      await this.reload()
      return { ok: true, mode: "remote", updatedAt: this.getCatalog().updatedAt }
    }
    if (process.env.DATA_READONLY) {
      return { ok: false, reason: "read-only environment: update data via redeploy instead" }
    }
    await execFileAsync("bash", [path.join(ROOT_DIR, "scripts/update-data.sh")], { cwd: ROOT_DIR })
    await this.reload()
    return { ok: true, mode: "local", updatedAt: this.getCatalog().updatedAt }
  }

  async reload() {
    const startedAt = Date.now()
    const [catalogRaw, apiRaw, labsRaw] = DATA_SOURCE === "remote" ? await fetchRemote() : await readLocal()
    this.catalog = buildCatalog(catalogRaw, apiRaw, labsRaw)
    console.log(
      `catalog loaded (${DATA_SOURCE}): ${this.catalog.models.length} models, ${this.catalog.labs.length} labs in ${Date.now() - startedAt}ms`,
    )
  }
}

async function readLocal(): Promise<[unknown, unknown, string]> {
  return Promise.all([
    readFile(path.join(DATA_DIR, "catalog.json"), "utf8").then(JSON.parse),
    readFile(path.join(DATA_DIR, "api.json"), "utf8").then(JSON.parse),
    readFile(path.join(DATA_DIR, "labs.html"), "utf8"),
  ])
}

type RemoteResponse = { ok: boolean; json(): Promise<unknown>; text(): Promise<string> }

async function fetchRemote(): Promise<[unknown, unknown, string]> {
  const [catalog, api, labs] = await Promise.all([
    fetch(REMOTE_URLS.catalog) as Promise<RemoteResponse>,
    fetch(REMOTE_URLS.api) as Promise<RemoteResponse>,
    fetch(REMOTE_URLS.labs) as Promise<RemoteResponse>,
  ])
  return [catalog.ok ? await catalog.json() : undefined, api.ok ? await api.json() : undefined, labs.ok ? await labs.text() : ""]
}

function buildCatalog(payload: unknown, apiPayload: unknown, labsHtml: string): Catalog {
  const providerCosts = readProviderCosts(apiPayload)
  const labDescriptions = readLabDescriptions(labsHtml)
  const models = readCatalogModels(payload)
    .flatMap(readModelEntry)
    .map((model) => {
      const providers = mergeProviders(providerCosts.get(model.id), providerCosts.get(model.slug))
      const official = providers.find((p) => p.id === model.lab && p.cost)?.cost
      const cheapest = providers
        .filter((p) => p.cost)
        .sort((a, b) => a.cost!.input - b.cost!.input)[0]?.cost
      return { ...model, providers, cost: official ?? cheapest ?? model.cost }
    })
    .toSorted((a, b) => a.lab.localeCompare(b.lab) || dateValue(b.releaseDate) - dateValue(a.releaseDate))

  const labs = Object.values(
    models.reduce<Record<string, LabEntry>>((result, model) => {
      const existing = result[model.lab]
      result[model.lab] = {
        id: model.lab,
        name: formatLabName(model.lab),
        description: existing?.description ?? labDescriptions.get(model.lab),
        modelCount: (existing?.modelCount ?? 0) + 1,
        models: [...(existing?.models ?? []), model],
      }
      return result
    }, {}),
  ).toSorted((a, b) => a.name.localeCompare(b.name))

  return { models, labs, updatedAt: new Date().toISOString() }
}

function readModelEntry(value: unknown): ModelEntry[] {
  if (!isRecord(value)) return []
  const id = stringValue(value.id)
  const name = stringValue(value.name)
  const lab = id?.split("/")[0]
  const slug = id?.split("/").slice(1).join("/")
  if (!id || !name || !lab || !slug) return []
  return [
    {
      id,
      lab: catalogLabSlug(lab),
      slug: catalogSlug(slug),
      name,
      description: stringValue(value.description),
      family: stringValue(value.family),
      knowledge: stringValue(value.knowledge),
      releaseDate: stringValue(value.release_date),
      lastUpdated: stringValue(value.last_updated),
      license: stringValue(value.license),
      limit: isRecord(value.limit)
        ? { context: numberValue(value.limit.context), output: numberValue(value.limit.output) }
        : undefined,
      modalities: isRecord(value.modalities)
        ? { input: stringArrayValue(value.modalities.input), output: stringArrayValue(value.modalities.output) }
        : { input: [], output: [] },
      openWeights: value.open_weights === true,
      reasoning: value.reasoning === true,
      toolCall: value.tool_call === true,
      attachment: value.attachment === true,
      temperature: value.temperature === true,
      structuredOutput: value.structured_output === true,
      cost: readCost(value.cost),
      weights: readLinks(value.weights),
      links: readLinks(value.links),
      benchmarks: readBenchmarks(value.benchmarks),
      providers: [],
    },
  ]
}

function readProviderCosts(payload: unknown) {
  const result = new Map<string, { id: string; name: string; cost?: ModelCost }[]>()
  if (!isRecord(payload)) return result
  Object.values(payload).forEach((provider) => {
    if (!isRecord(provider) || !isRecord(provider.models)) return
    const providerId = stringValue(provider.id) ?? "unknown"
    const providerName = stringValue(provider.name) ?? providerId
    Object.values(provider.models).forEach((model) => {
      if (!isRecord(model)) return
      const id = stringValue(model.id)
      if (!id) return
      const keys = new Set(
        [catalogSlug(id), id.includes("/") ? catalogIdKey(id) : `${catalogSlug(providerId)}/${catalogSlug(id)}`].filter(
          Boolean,
        ),
      )
      keys.forEach((key) => {
        const list = result.get(key) ?? []
        list.push({ id: providerId, name: providerName, cost: readCost(model.cost) })
        result.set(key, list)
      })
    })
  })
  return result
}

function mergeProviders(
  ...lists: ({ id: string; name: string; cost?: ModelCost }[] | undefined)[]
): { id: string; name: string; cost?: ModelCost }[] {
  const seen = new Map<string, { id: string; name: string; cost?: ModelCost }>()
  lists.flat().forEach((p) => p && seen.set(p.id, p))
  return [...seen.values()]
}

function readLabDescriptions(html: string) {
  const descriptions = new Map<string, string>()
  const match = /<script[^>]*id=["']search-index["'][^>]*>([\s\S]*?)<\/script>/.exec(html)
  if (!match) return descriptions
  try {
    const parsed = JSON.parse(match[1]) as unknown
    if (!Array.isArray(parsed)) return descriptions
    parsed.forEach((item) => {
      if (!isRecord(item) || item.type !== "lab") return
      const id = stringValue(item.id)
      const description = stringValue(item.description)
      if (id && description) descriptions.set(catalogLabSlug(id), description)
    })
  } catch {
    return descriptions
  }
  return descriptions
}

function readCatalogModels(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []
  if (Array.isArray(payload.models)) return payload.models
  if (isRecord(payload.models)) return Object.values(payload.models)
  return Object.values(payload)
}

function readCost(value: unknown): ModelCost | undefined {
  if (!isRecord(value)) return undefined
  const input = numberValue(value.input)
  const output = numberValue(value.output)
  if (input === undefined || output === undefined) return undefined
  return { input, output, cacheRead: numberValue(value.cache_read), cacheWrite: numberValue(value.cache_write) }
}

function readBenchmarks(value: unknown): ModelBenchmark[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const name = stringValue(item.name)
    const score = numberValue(item.score)
    return name && score !== undefined
      ? [
          {
            name,
            score,
            metric: stringValue(item.metric),
            harness: stringValue(item.harness),
            variant: stringValue(item.variant),
            dataset: stringValue(item.dataset),
            version: stringValue(item.version),
            source: stringValue(item.source),
          },
        ]
      : []
  })
}

function readLinks(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const label = stringValue(item.label)
    const url = stringValue(item.url)
    return label && url ? [{ label, url }] : []
  })
}

export function catalogSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

function catalogIdKey(value: string) {
  return value.split("/").map(catalogSlug).join("/")
}

function catalogLabSlug(value: string) {
  const slug = catalogSlug(value)
  const aliases: Record<string, string> = {
    moonshot: "moonshotai",
    qwen: "alibaba",
    zhipu: "zhipuai",
    zai: "zhipuai",
  }
  return aliases[slug] ?? slug
}

export function formatLabName(lab: string) {
  const known: Record<string, string> = {
    alibaba: "Alibaba",
    anthropic: "Anthropic",
    cohere: "Cohere",
    deepseek: "DeepSeek",
    google: "Google",
    meta: "Meta",
    minimax: "MiniMax",
    mistral: "Mistral",
    moonshotai: "Moonshot",
    openai: "OpenAI",
    perplexity: "Perplexity",
    stepfun: "StepFun",
    tencent: "Tencent",
    xai: "xAI",
    xiaomi: "Xiaomi",
    zhipuai: "Zhipu",
  }
  return known[lab] ?? lab.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function dateValue(value: string | undefined) {
  return value ? new Date(value).getTime() || 0 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : []
}
