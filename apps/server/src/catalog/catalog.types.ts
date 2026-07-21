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
  providers: { id: string; name: string; cost?: ModelCost }[]
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
