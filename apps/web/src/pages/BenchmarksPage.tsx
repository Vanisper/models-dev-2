import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useMemo } from "react"
import { useCatalog } from "../api"

export function BenchmarksPage() {
  const catalog = useCatalog()
  const navigate = useNavigate({ from: "/benchmarks" })
  const search = useSearch({ from: "/benchmarks" }) as { name?: string }

  const benchmarkNames = useMemo(() => {
    const counts = new Map<string, number>()
    catalog.data?.models.forEach((m) =>
      m.benchmarks.forEach((b) => counts.set(b.name, (counts.get(b.name) ?? 0) + 1)),
    )
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [catalog.data])

  const selected = search.name ?? benchmarkNames[0]?.[0]

  const rows = useMemo(() => {
    if (!selected || !catalog.data) return []
    return catalog.data.models
      .flatMap((m) => m.benchmarks.filter((b) => b.name === selected).map((b) => ({ model: m, benchmark: b })))
      .sort((a, b) => b.benchmark.score - a.benchmark.score)
  }, [catalog.data, selected])

  if (catalog.isPending) return <div className="state">Loading…</div>
  if (catalog.isError) return <div className="state error">Failed to load: {String(catalog.error)}</div>
  if (benchmarkNames.length === 0) return <div className="state">No benchmark data</div>

  const max = Math.max(...rows.map((r) => r.benchmark.score), 1)

  return (
    <div>
      <div className="toolbar">
        <select value={selected} onChange={(e) => navigate({ search: { name: e.target.value } })}>
          {benchmarkNames.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>
        <span className="meta">{rows.length} models scored</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Model</th>
            <th>Lab</th>
            <th>Score</th>
            <th style={{ width: "40%" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ model, benchmark }, i) => (
            <tr key={model.id}>
              <td className="num">{i + 1}</td>
              <td>
                <div className="model-name">
                  <Link to="/models/$lab/$slug" params={{ lab: model.lab, slug: model.slug }}>
                    {model.name}
                  </Link>
                </div>
                <div className="model-id">{model.id}</div>
              </td>
              <td>
                <span className="badge lab">{model.lab}</span>
              </td>
              <td className="num">{benchmark.score}</td>
              <td>
                <div className="bar-wrap">
                  <div className="bar" style={{ width: `${(benchmark.score / max) * 100}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
