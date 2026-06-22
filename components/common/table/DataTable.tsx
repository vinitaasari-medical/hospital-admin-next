/**
 * <DataTable />
 * ------------------------------------------------------------------
 * Production-ready table built on top of shadcn <Table />.
 *
 * Features:
 *  - Column definitions (header / cell / accessor / sortable / className / hideOnMobile)
 *  - Client-side search (configurable searchable columns)
 *  - Client-side sort (multi-direction)
 *  - Pagination (client OR server)
 *  - Multi-select with bulk actions
 *  - Column visibility toggle
 *  - Row actions (dropdown)
 *  - Sticky header
 *  - Loading skeleton
 *  - Empty state
 *  - Mobile responsive (`hideOnMobile` columns drop out under md)
 *
 * Server-side mode: pass `pagination={ mode: "server", ... }` and the
 * `onSortChange`, `onSearchChange`, `onPageChange` callbacks.
 */
import * as React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, ArrowUpDown, Info, MoreHorizontal, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Search } from "../search";
import { Pagination } from "../pagination";
import { EmptyState, type EmptyStateProps } from "../empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DataTableRowInfo {
  createdBy?: string | null;
  createdAt?: string | Date | null;
}

const formatInfoDate = (v: string | Date) => {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  /** Stable key — used for sort / visibility state. */
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Falls back to `row[key]` when omitted. */
  cell?: (row: T, rowIndex: number) => React.ReactNode;
  /** Value used for sorting & search. Defaults to `row[key]`. */
  accessor?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  searchable?: boolean;
  /** Hide under the `md` breakpoint. */
  hideOnMobile?: boolean;
  className?: string;
  headerClassName?: string;
  width?: string | number;
}

export interface DataTableRowAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: T) => void;
  destructive?: boolean;
  hidden?: (row: T) => boolean;
}

export interface DataTableBulkAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (rows: T[]) => void;
  destructive?: boolean;
}

export interface DataTablePagination {
  mode?: "client" | "server";
  pageSize?: number;
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Row identifier — required for selection & React keys. */
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Renders empty state when data is empty (and not loading). */
  emptyState?: EmptyStateProps;
  /** Title shown above the toolbar. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Slot rendered in the toolbar, e.g. <Button>Add</Button>. */
  toolbar?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  selectable?: boolean;
  bulkActions?: DataTableBulkAction<T>[];
  rowActions?: DataTableRowAction<T>[];
  /** When provided, renders an info icon per row showing created by/at in a popover. */
  rowInfo?: (row: T) => DataTableRowInfo | null | undefined;
  pagination?: DataTablePagination | false;
  /** Allow user to toggle column visibility. */
  columnVisibility?: boolean;
  /** Sticky header. Defaults to true. */
  stickyHeader?: boolean;
  /** Click-row handler. */
  onRowClick?: (row: T) => void;
  className?: string;
  /** Default sort. */
  defaultSort?: { key: string; direction: Exclude<SortDirection, null> };
  onSortChange?: (sort: { key: string; direction: SortDirection }) => void;
}

const DEFAULT_PAGE_SIZE = 10;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyState,
  title,
  description,
  toolbar,
  searchable = true,
  searchPlaceholder = "Search...",
  onSearchChange,
  selectable,
  bulkActions,
  rowActions,
  rowInfo,
  pagination,
  columnVisibility = false,
  stickyHeader = true,
  onRowClick,
  className,
  defaultSort,
  onSortChange,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(defaultSort?.direction ?? null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(pagination && pagination.page ? pagination.page : 1);
  const pageSize = (pagination && pagination.pageSize) || DEFAULT_PAGE_SIZE;
  const isServer = pagination && pagination.mode === "server";

  const visibleColumns = React.useMemo(
    () => columns.filter((c) => !hidden.has(c.key)),
    [columns, hidden],
  );

  // Filter
  const filtered = React.useMemo(() => {
    if (isServer || !search.trim()) return data;
    const q = search.trim().toLowerCase();
    const searchCols = columns.filter((c) => c.searchable !== false);
    return data.filter((row) =>
      searchCols.some((c) => {
        const v = c.accessor ? c.accessor(row) : (row as Record<string, unknown>)[c.key];
        return String(v ?? "").toLowerCase().includes(q);
      }),
    );
  }, [data, search, columns, isServer]);

  // Sort
  const sorted = React.useMemo(() => {
    if (isServer || !sortKey || !sortDir) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const get = (row: T) => (col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key]);
    return [...filtered].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortKey, sortDir, columns, isServer]);

  // Pagination
  const total = isServer ? pagination && pagination.total : sorted.length;
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const paged = React.useMemo(() => {
    if (!pagination || isServer) return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize, pagination, isServer]);

  const allSelectedOnPage =
    paged.length > 0 && paged.every((r) => selected.has(rowKey(r)));
  const someSelectedOnPage = paged.some((r) => selected.has(rowKey(r)));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelectedOnPage) {
      paged.forEach((r) => next.delete(rowKey(r)));
    } else {
      paged.forEach((r) => next.add(rowKey(r)));
    }
    setSelected(next);
  };

  const toggleRow = (row: T) => {
    const id = rowKey(row);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    let nextDir: SortDirection = "asc";
    if (sortKey === col.key) {
      nextDir = sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc";
    }
    setSortKey(nextDir ? col.key : null);
    setSortDir(nextDir);
    onSortChange?.({ key: col.key, direction: nextDir });
  };

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
    onSearchChange?.(v);
  };

  const selectedRows = data.filter((r) => selected.has(rowKey(r)));
  const colSpan =
    visibleColumns.length + (selectable ? 1 : 0) + (rowInfo ? 1 : 0) + (rowActions?.length ? 1 : 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Toolbar */}
      {(searchable || toolbar || columnVisibility) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {searchable && (
            <Search
              value={search}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="sm:max-w-xs"
            />
          )}
          <div className="flex items-center gap-2 sm:ml-auto">
            {toolbar}
            {columnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.key}
                      checked={!hidden.has(c.key)}
                      onCheckedChange={(checked) => {
                        const next = new Set(hidden);
                        if (checked) next.delete(c.key);
                        else next.add(c.key);
                        setHidden(next);
                      }}
                    >
                      {typeof c.header === "string" ? c.header : c.key}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectable && selected.size > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.map((a) => (
              <Button
                key={a.label}
                variant={a.destructive ? "destructive" : "outline"}
                size="sm"
                onClick={() => a.onClick(selectedRows)}
                className="gap-1.5"
              >
                {a.icon && <a.icon className="h-4 w-4" />}
                {a.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="relative w-full overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-card")}>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelectedOnPage}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      data-state={someSelectedOnPage && !allSelectedOnPage ? "indeterminate" : undefined}
                    />
                  </TableHead>
                )}
                {visibleColumns.map((c) => {
                  const active = sortKey === c.key;
                  return (
                    <TableHead
                      key={c.key}
                      style={c.width ? { width: c.width } : undefined}
                      className={cn(
                        "whitespace-nowrap",
                        c.headerClassName,
                        c.hideOnMobile && "hidden md:table-cell",
                        c.sortable && "cursor-pointer select-none",
                      )}
                      onClick={() => handleSort(c)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.header}
                        {c.sortable && (
                          <>
                            {!active && <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />}
                            {active && sortDir === "asc" && <ArrowUp className="h-3 w-3" />}
                            {active && sortDir === "desc" && <ArrowDown className="h-3 w-3" />}
                          </>
                        )}
                      </span>
                    </TableHead>
                  );
                })}
                {rowInfo && <TableHead className="w-10" />}
                {rowActions && rowActions.length > 0 && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={`s-${i}`}>
                    {selectable && (
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    {visibleColumns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn(c.hideOnMobile && "hidden md:table-cell")}
                      >
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                    {rowInfo && (
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                    )}
                    {rowActions && rowActions.length > 0 && (
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}

              {!loading && paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colSpan} className="p-0">
                    <EmptyState
                      title={emptyState?.title ?? "No results"}
                      description={emptyState?.description ?? "Try adjusting your search or filters."}
                      icon={emptyState?.icon}
                      action={emptyState?.action}
                      className="py-10"
                    />
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                paged.map((row, i) => {
                  const id = rowKey(row);
                  const isSelected = selected.has(id);
                  return (
                    <TableRow
                      key={id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={onRowClick ? "cursor-pointer" : undefined}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(row)}
                            aria-label="Select row"
                          />
                        </TableCell>
                      )}
                      {visibleColumns.map((c) => (
                        <TableCell
                          key={c.key}
                          className={cn("whitespace-nowrap", c.className, c.hideOnMobile && "hidden md:table-cell")}
                        >
                          {c.cell
                            ? c.cell(row, i)
                            : String((row as Record<string, unknown>)[c.key] ?? "")}
                        </TableCell>
                      ))}
                      {rowInfo && (() => {
                        const info = rowInfo(row);
                        if (!info) return <TableCell />;
                        return (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="Row info"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-64">
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Created by
                                    </div>
                                    <div className="text-foreground font-medium">
                                      {info.createdBy || "—"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Created at
                                    </div>
                                    <div className="text-foreground">
                                      {info.createdAt ? formatInfoDate(info.createdAt) : "—"}
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        );
                      })()}
                      {rowActions && rowActions.length > 0 && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {rowActions
                                .filter((a) => !a.hidden || !a.hidden(row))
                                .map((a) => (
                                  <DropdownMenuItem
                                    key={a.label}
                                    onClick={() => a.onClick(row)}
                                    className={cn(
                                      a.destructive && "text-destructive focus:text-destructive",
                                    )}
                                  >
                                    {a.icon && <a.icon className="h-4 w-4 mr-2" />}
                                    {a.label}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination !== false && (total ?? 0) > pageSize && (
        <Pagination
          page={isServer ? (pagination && pagination.page) || 1 : page}
          totalPages={totalPages}
          onPageChange={(p) => {
            if (isServer) pagination && pagination.onPageChange?.(p);
            else setPage(p);
          }}
        />
      )}
    </div>
  );
}
