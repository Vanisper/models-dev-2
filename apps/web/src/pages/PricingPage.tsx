import { Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { formatPrice, useCatalog } from "../api"

type SortKey = "input" | "output" | "blended"

export function PricingPage() {
  const catalog = useCatalog()
  const [sortKey, setSortKey] = useState<SortKey>("blended")
  const [onlyPriced, setOnlyPriced] = useState(true)

  const models = useMemo(() => {
    let list = catalog.data?.models ?? []
    if (onlyPriced) list = list.filter((m) => m.cost)
    const blended = (m: (typeof list)[number]) => (m.cost ? m.cost.input * 0.75 + m.cost.output * 0.25 : Infinity)
    return [...list].sort((a, b) => {
      if (sortKey === "input") return (a.cost?.input ?? Infinity) - (b.cost?.input ?? Infinity)
      if (sortKey === "output") return (a.cost?.output ?? Infinity) - (b.cost?.output ?? Infinity)
      return blended(a) - blended(b)
    })
  }, [catalog.data, sortKey, onlyPriced])

  if (catalog.isPending) return <div className="state">Loading…</div>
  if (catalog.isError) return <div className="state error">Failed to load: {String(catalog.error)}</div>

  const maxOutput = Math.max(...models.map((m) => m.cost?.output ?? 0), 1)

  return (
    <div>
      <div className="toolbar">
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="blended">Sort: blended (3:1 in/out)</option>
          <option value="input">Sort: input price</option>
          <option value="output">Sort: output price</option>
        </select>
        <label style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--text-dim)" }}>
          <input type="checkbox" checked={onlyPriced} onChange={(e) => setOnlyPriced(e.target.checked)} />
          priced only
        </label>
        <span className="meta">{models.length} models · prices per 1M tokens</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Model</th>
            <th>Lab</th>
            <th>Input</th>
            <th>Output</th>
            <th style={{ width: "28%" }}></th>
            <th>Cache read</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => (
            <tr key={m.id}>
              <td className="num">{i + 1}</td>
              <td>
                <div className="model-name">
                  <Link to="/models/$lab/$slug" params={{ lab: m.lab, slug: m.slug }}>
                    {m.name}
                  </Link>
                </div>
                <div className="model-id">{m.id}</div>
              </td>
              <td>
                <span className="badge lab">{m.lab}</span>
              </td>
              <td className="num">{formatPrice(m.cost?.input)}</td>
              <td className="num">{formatPrice(m.cost?.output)}</td>
              <td>
                {m.cost && (
                  <div className="bar-wrap">
                    <div className="bar green" style={{ width: `${(m.cost.output / maxOutput) * 100}%` }} />
                  </div>
                )}
              </td>
              <td className="num">{m.cost?.cacheRead !== undefined ? formatPrice(m.cost.cacheRead) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
