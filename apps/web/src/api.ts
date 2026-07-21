import { useQuery } from "@tanstack/react-query"

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

export type ModelCost = {
  input: number
  output: number
  cacheRead?: number
  cacheWrite?: number
}

export type ModelBenchmark = {
  name: string
  score: number
  metric?: string
  harness?: string
  variant?: string
  dataset?: string
  version?: string
  source?: string
}

export type ModelProvider = {
  id: string
  name: string
  cost?: ModelCost
}

export type ModelEntry = {
  id: string
  lab: string
  slug: string
  name: string
  description?: string
  family?: string
  knowledge?: string
  releaseDate?: string
  lastUpdated?: string
  license?: string
  limit?: { context?: number; output?: number }
  modalities: { input: string[]; output: string[] }
  openWeights: boolean
  reasoning: boolean
  toolCall: boolean
  attachment: boolean
  temperature: boolean
  structuredOutput: boolean
  cost?: ModelCost
  weights: { label: string; url: string }[]
  links: { label: string; url: string }[]
  benchmarks: ModelBenchmark[]
  providers: ModelProvider[]
}

export type LabEntry = {
  id: string
  name: string
  description?: string
  modelCount: number
  models: ModelEntry[]
}

export type Catalog = {
  models: ModelEntry[]
  labs: LabEntry[]
  updatedAt: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`)
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  return response.json() as Promise<T>
}

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchJson<Catalog>("/api/catalog"),
    staleTime: 60_000,
  })
}

export function useModel(lab: string, slug: string) {
  return useQuery({
    queryKey: ["model", lab, slug],
    queryFn: () => fetchJson<ModelEntry>(`/api/catalog/models/${lab}/${slug}`),
  })
}

export async function refreshCatalog() {
  const response = await fetch(`${API_BASE}/api/catalog/refresh`, { method: "POST" })
  if (!response.ok) throw new Error(`refresh failed: ${response.status}`)
  return response.json()
}

export function formatPrice(value: number | undefined) {
  if (value === undefined) return "-"
  return `$${value.toFixed(2)}`
}

export function formatTokens(value: number | undefined) {
  if (value === undefined) return "-"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(value)
}
