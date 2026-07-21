import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { formatPrice, formatTokens, ModelEntry, useCatalog } from "../api"

const columnHelper = createColumnHelper<ModelEntry>()

const columns = [
  columnHelper.accessor("name", {
    header: "Model",
    cell: (info) => (
      <div>
        <div className="model-name">
          <Link to="/models/$lab/$slug" params={{ lab: info.row.original.lab, slug: info.row.original.slug }}>
            {info.getValue()}
          </Link>
        </div>
        <div className="model-id">{info.row.original.id}</div>
      </div>
    ),
  }),
  columnHelper.accessor("lab", {
    header: "Lab",
    cell: (info) => <span className="badge lab">{info.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.cost?.input, {
    id: "input",
    header: "Input /1M",
    cell: (info) => <span className="num">{formatPrice(info.getValue())}</span>,
  }),
  columnHelper.accessor((row) => row.cost?.output, {
    id: "output",
    header: "Output /1M",
    cell: (info) => <span className="num">{formatPrice(info.getValue())}</span>,
  }),
  columnHelper.accessor((row) => row.limit?.context, {
    id: "context",
    header: "Context",
    cell: (info) => <span className="num">{formatTokens(info.getValue())}</span>,
  }),
  columnHelper.display({
    id: "capabilities",
    header: "Capabilities",
    cell: (info) => (
      <div className="badges">
        {info.row.original.reasoning && <span className="badge on">reasoning</span>}
        {info.row.original.toolCall && <span className="badge on">tools</span>}
        {info.row.original.attachment && <span className="badge on">files</span>}
        {info.row.original.openWeights && <span className="badge on">open</span>}
        {info.row.original.modalities.input
          .filter((m) => m !== "text")
          .map((m) => (
            <span key={m} className="badge">
              {m}
            </span>
          ))}
      </div>
    ),
  }),
  columnHelper.accessor("releaseDate", {
    header: "Released",
    cell: (info) => <span className="num">{info.getValue() ?? "-"}</span>,
  }),
]

export function ModelsPage() {
  const catalog = useCatalog()
  const navigate = useNavigate({ from: "/" })
  const search = useSearch({ from: "/" }) as { q?: string; lab?: string }
  const [sorting, setSorting] = useState<SortingState>([{ id: "releaseDate", desc: true }])

  const models = useMemo(() => {
    let list = catalog.data?.models ?? []
    if (search.lab) list = list.filter((m) => m.lab === search.lab)
    if (search.q) {
      const needle = search.q.toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(needle) ||
          m.id.toLowerCase().includes(needle) ||
          m.description?.toLowerCase().includes(needle),
      )
    }
    return list
  }, [catalog.data, search.q, search.lab])

  const table = useReactTable({
    data: models,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (catalog.isPending) return <div className="state">Loading catalog…</div>
  if (catalog.isError) return <div className="state error">Failed to load: {String(catalog.error)}</div>

  return (
    <div>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search models…"
          value={search.q ?? ""}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, q: e.target.value || undefined }) })}
        />
        <select
          value={search.lab ?? ""}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, lab: e.target.value || undefined }) })}
        >
          <option value="">All labs</option>
          {catalog.data.labs.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.name} ({lab.modelCount})
            </option>
          ))}
        </select>
        <span className="meta">{models.length} models</span>
      </div>
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string]}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
