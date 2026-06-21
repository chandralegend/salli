"use client";

import * as React from "react";
import {
  type ColumnDef,
  type Row,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
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
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  emptyNode,
  getRowClassName,
  searchPlaceholder,
  searchColumn,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

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

      {/* Footer row count */}
      {!isLoading && rows.length > 0 && (
        <div className="px-4 py-2.5 border-t bg-muted/20">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
            {rows.length !== data.length && ` of ${data.length} total`}
          </p>
        </div>
      )}
    </div>
  );
}
