import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router"
import { refreshCatalog, useCatalog } from "./api"
import { BenchmarksPage } from "./pages/BenchmarksPage"
import { LabsPage } from "./pages/LabsPage"
import { ModelDetailPage } from "./pages/ModelDetailPage"
import { ModelsPage } from "./pages/ModelsPage"
import { PricingPage } from "./pages/PricingPage"

function RootLayout() {
  const queryClient = useQueryClient()
  const catalog = useCatalog()
  const refresh = useMutation({
    mutationFn: refreshCatalog,
    onSuccess: () => queryClient.invalidateQueries(),
  })

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="brand">
          models.dev
        </Link>
        <nav className="nav">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "active" }}>
            Models
          </Link>
          <Link to="/pricing" activeProps={{ className: "active" }}>
            Pricing
          </Link>
          <Link to="/benchmarks" activeProps={{ className: "active" }}>
            Benchmarks
          </Link>
          <Link to="/labs" activeProps={{ className: "active" }}>
            Labs
          </Link>
        </nav>
        <div className="header-right">
          {catalog.data && (
            <span className="meta">
              {catalog.data.models.length} models · {catalog.data.labs.length} labs
            </span>
          )}
          <button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? "Updating…" : "Update data"}
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })

const modelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ModelsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.q === "string" ? { q: search.q } : {}),
    ...(typeof search.lab === "string" ? { lab: search.lab } : {}),
  }),
})

const modelDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/models/$lab/$slug",
  component: ModelDetailPage,
})

const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pricing",
  component: PricingPage,
})

const benchmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/benchmarks",
  component: BenchmarksPage,
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.name === "string" ? { name: search.name } : {}),
  }),
})

const labsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/labs",
  component: LabsPage,
})

const routeTree = rootRoute.addChildren([modelsRoute, modelDetailRoute, pricingRoute, benchmarksRoute, labsRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
