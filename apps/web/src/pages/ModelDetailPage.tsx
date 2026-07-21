import { useParams } from "@tanstack/react-router"
import { formatPrice, formatTokens, useModel } from "../api"

export function ModelDetailPage() {
  const { lab, slug } = useParams({ from: "/models/$lab/$slug" })
  const model = useModel(lab, slug)

  if (model.isPending) return <div className="state">Loading…</div>
  if (model.isError) return <div className="state error">Failed to load: {String(model.error)}</div>

  const m = model.data

  return (
    <div>
      <div className="detail-header">
        <div className="model-id">{m.id}</div>
        <h1>{m.name}</h1>
        {m.description && <p style={{ color: "var(--text-dim)", maxWidth: 720 }}>{m.description}</p>}
        <div className="badges" style={{ marginTop: 10 }}>
          <span className="badge lab">{m.lab}</span>
          {m.family && <span className="badge">{m.family}</span>}
          {m.reasoning && <span className="badge on">reasoning</span>}
          {m.toolCall && <span className="badge on">tool call</span>}
          {m.attachment && <span className="badge on">attachments</span>}
          {m.structuredOutput && <span className="badge on">structured output</span>}
          {m.openWeights && <span className="badge on">open weights</span>}
          {m.license && <span className="badge">{m.license}</span>}
        </div>
      </div>

      <div className="detail-grid">
        <Stat label="Input price /1M" value={m.cost ? formatPrice(m.cost.input) : "-"} />
        <Stat label="Output price /1M" value={m.cost ? formatPrice(m.cost.output) : "-"} />
        <Stat label="Cache read /1M" value={m.cost?.cacheRead !== undefined ? formatPrice(m.cost.cacheRead) : "-"} />
        <Stat label="Cache write /1M" value={m.cost?.cacheWrite !== undefined ? formatPrice(m.cost.cacheWrite) : "-"} />
        <Stat label="Context" value={formatTokens(m.limit?.context)} />
        <Stat label="Max output" value={formatTokens(m.limit?.output)} />
        <Stat label="Released" value={m.releaseDate ?? "-"} />
        <Stat label="Knowledge cutoff" value={m.knowledge ?? "-"} />
        <Stat label="Input modalities" value={m.modalities.input.join(", ") || "-"} />
        <Stat label="Output modalities" value={m.modalities.output.join(", ") || "-"} />
      </div>

      {m.benchmarks.length > 0 && (
        <div className="section">
          <h2>Benchmarks</h2>
          <table>
            <thead>
              <tr>
                <th>Benchmark</th>
                <th>Score</th>
                <th></th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {[...m.benchmarks]
                .sort((a, b) => b.score - a.score)
                .map((b, i) => {
                  const max = Math.max(...m.benchmarks.map((x) => x.score), 100)
                  return (
                    <tr key={i}>
                      <td>{b.name}</td>
                      <td className="num">{b.score}</td>
                      <td style={{ width: "30%" }}>
                        <div className="bar-wrap">
                          <div className="bar" style={{ width: `${(b.score / max) * 100}%` }} />
                        </div>
                      </td>
                      <td>
                        {b.source && (
                          <a href={b.source} target="_blank" rel="noreferrer" className="model-id">
                            link ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {m.providers.length > 0 && (
        <div className="section">
          <h2>Providers ({m.providers.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Input /1M</th>
                <th>Output /1M</th>
                <th>Cache read /1M</th>
              </tr>
            </thead>
            <tbody>
              {[...m.providers]
                .sort((a, b) => (a.cost?.input ?? Infinity) - (b.cost?.input ?? Infinity))
                .map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="num">{formatPrice(p.cost?.input)}</td>
                    <td className="num">{formatPrice(p.cost?.output)}</td>
                    <td className="num">{p.cost?.cacheRead !== undefined ? formatPrice(p.cost.cacheRead) : "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {(m.weights.length > 0 || m.links.length > 0) && (
        <div className="section">
          <h2>Links</h2>
          <div className="badges">
            {m.weights.map((w) => (
              <a key={w.url} href={w.url} target="_blank" rel="noreferrer" className="badge on">
                {w.label} ↗
              </a>
            ))}
            {m.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="badge">
                {l.label} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}
