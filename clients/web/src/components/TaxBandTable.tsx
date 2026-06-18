import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface TaxBand {
  band: string;
  rate: string;
  taxable_in_band: string;
  tax: string;
}

interface TaxBandTableProps {
  bands: TaxBand[];
  total_tax: string;
  currency?: string;
}

export function TaxBandTable({
  bands,
  total_tax,
  currency = "LKR",
}: TaxBandTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
            Band
          </TableHead>
          <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider text-right">
            Rate
          </TableHead>
          <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider text-right">
            Taxable in Band
          </TableHead>
          <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider text-right">
            Tax
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bands.map((band, i) => (
          <TableRow key={i} className="border-border hover:bg-secondary/40">
            <TableCell className="text-sm text-foreground">{band.band}</TableCell>
            <TableCell className="font-mono text-sm text-right text-muted-foreground">
              {band.rate}
            </TableCell>
            <TableCell className="font-mono text-sm text-right text-foreground">
              {currency} {band.taxable_in_band}
            </TableCell>
            <TableCell className="font-mono text-sm text-right text-foreground">
              {currency} {band.tax}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 border-border font-bold hover:bg-secondary/40">
          <TableCell
            colSpan={3}
            className="text-sm font-semibold text-foreground"
          >
            Total Tax
          </TableCell>
          <TableCell
            className={cn(
              "font-mono text-sm font-bold text-right",
              "text-expense"
            )}
          >
            {currency} {total_tax}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
