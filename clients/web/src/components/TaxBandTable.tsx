import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

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

export function TaxBandTable({ bands, total_tax, currency = "LKR" }: TaxBandTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
          <TableHead className="h-9 px-3">
            <span className="text-secondary-label">Band</span>
          </TableHead>
          <TableHead className="h-9 px-3 text-right">
            <span className="text-secondary-label">Rate</span>
          </TableHead>
          <TableHead className="h-9 px-3 text-right">
            <span className="text-secondary-label">Taxable in Band</span>
          </TableHead>
          <TableHead className="h-9 px-3 text-right">
            <span className="text-secondary-label">Tax</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bands.map((band, i) => (
          <TableRow key={i} className="border-b last:border-0">
            <TableCell className="px-3 py-2.5 text-[13px]">{band.band}</TableCell>
            <TableCell className="px-3 py-2.5 text-right tabular-nums text-[13px]">{band.rate}</TableCell>
            <TableCell className="px-3 py-2.5 text-right tabular-nums text-[13px]">
              {currency} {band.taxable_in_band}
            </TableCell>
            <TableCell className="px-3 py-2.5 text-right tabular-nums text-[13px]">
              {currency} {band.tax}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="bg-muted/30 border-t-2">
          <TableCell colSpan={3} className="px-3 py-2.5 text-[13px] font-semibold">
            Total Tax
          </TableCell>
          <TableCell className="px-3 py-2.5 text-right tabular-nums text-[13px] font-bold text-primary">
            {currency} {total_tax}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
