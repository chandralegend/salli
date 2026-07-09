"use client";

import * as React from "react";
import {
  type ColumnDef,
  type Row,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ── Column header with sort toggle ── */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: import("@tanstack/react-table").Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <span className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>{title}</span>;
  }
  const sorted = column.getIsSorted();
  return (
    <button
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group",
        className
      )}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="size-3 text-primary" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3 text-primary" />
      ) : (
        <ArrowUpDown className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      )}
    </button>
  );
}

/* ── Main DataTable component ── */
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyNode?: React.ReactNode;
  getRowClassName?: (row: Row<TData>) => string;
  searchPlaceholder?: string;
  searchColumn?: string;
  toolbar?: React.ReactNode;
  pageSize?: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  emptyNode,
  getRowClassName,
  searchPlaceholder,
  searchColumn,
  toolbar,
  pageSize: defaultPageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const from = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalFiltered);
  const showPagination = !isLoading && totalFiltered > 0;

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      {(searchPlaceholder || toolbar) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
          {searchPlaceholder && (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={searchColumn
                  ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
                  : globalFilter}
                onChange={(e) =>
                  searchColumn
                    ? table.getColumn(searchColumn)?.setFilterValue(e.target.value)
                    : setGlobalFilter(e.target.value)
                }
                className="h-8 pl-8 text-[12px] max-w-xs bg-transparent"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 ml-auto">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40 border-b">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={header.getSize() !== 150 ? { width: header.getSize() } : undefined}
                  className="h-9 px-3"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-32 text-center">
                {emptyNode ?? (
                  <span className="text-[13px] text-muted-foreground">No results</span>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn("border-b last:border-0", getRowClassName?.(row))}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination footer */}
      {showPagination && (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-t bg-muted/20">
          {/* Rows per page */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="text-[11px] border border-border rounded-md px-1.5 py-1 bg-background text-foreground cursor-pointer hover:border-ring transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Range label */}
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {from}–{to} of {totalFiltered}
            {totalFiltered !== data.length && (
              <span className="text-muted-foreground/60"> (filtered from {data.length})</span>
            )}
          </span>

          {/* Page navigation */}
          <div className="flex items-center gap-0.5 shrink-0">
            <PaginationButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="First page"
            >
              <ChevronsLeft className="size-3.5" />
            </PaginationButton>
            <PaginationButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </PaginationButton>
            <span className="text-[11px] text-muted-foreground px-2 tabular-nums min-w-[80px] text-center">
              Page {pageIndex + 1} of {pageCount || 1}
            </span>
            <PaginationButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="Next page"
            >
              <ChevronRight className="size-3.5" />
            </PaginationButton>
            <PaginationButton
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              title="Last page"
            >
              <ChevronsRight className="size-3.5" />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
