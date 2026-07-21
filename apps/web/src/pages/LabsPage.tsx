import { Link } from "@tanstack/react-router"
import { useCatalog } from "../api"

export function LabsPage() {
  const catalog = useCatalog()

  if (catalog.isPending) return <div className="state">Loading…</div>
  if (catalog.isError) return <div className="state error">Failed to load: {String(catalog.error)}</div>

  const labs = [...catalog.data.labs].sort((a, b) => b.modelCount - a.modelCount)

  return (
    <div className="cards">
      {labs.map((lab) => {
        const latest = lab.models
          .map((m) => m.releaseDate)
          .filter(Boolean)
          .sort()
          .at(-1)
        return (
          <Link key={lab.id} to="/" search={{ lab: lab.id }} className="card">
            <h3>
              {lab.name}
              <span className="meta">{lab.modelCount} models</span>
            </h3>
            <div className="badges">
              {[...new Set(lab.models.map((m) => m.family).filter(Boolean))].slice(0, 6).map((family) => (
                <span key={family} className="badge">
                  {family}
                </span>
              ))}
            </div>
            {lab.description && <p>{lab.description}</p>}
            {latest && <p className="model-id">latest release: {latest}</p>}
          </Link>
        )
      })}
    </div>
  )
}
