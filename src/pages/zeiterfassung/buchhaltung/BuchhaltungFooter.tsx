import { formatHours } from "@/lib/shiftCalculations";
import { displayNum } from "./utils";
import type { EmployeeTotals } from "./types";

interface BuchhaltungFooterProps {
  grandTotals: EmployeeTotals;
}

export default function BuchhaltungFooter({ grandTotals }: BuchhaltungFooterProps) {
  return (
    <tfoot>
      <tr className="bg-muted/60 border-t-2 border-border font-bold text-sm sticky bottom-0">
        <td className="px-2 py-2.5 uppercase tracking-wide text-muted-foreground">Gesamt</td>
        <td className="text-center px-1 py-2.5 tabular-nums bg-primary/10 border-l border-border/40">{formatHours(grandTotals.gesamt)}</td>
        <td className="text-center px-1 py-2.5 tabular-nums">{grandTotals.schichten}</td>
        <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.soFei, formatHours)}</td>
        <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.evening, formatHours)}</td>
        <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.night, formatHours)}</td>
        <td className="text-center px-1 py-2.5 tabular-nums text-green-600 border-l border-border/40">
          {grandTotals.urlaubTage > 0 ? grandTotals.urlaubTage.toFixed(2).replace('.', ',') : "–"}
        </td>
        <td className="text-center px-1 py-2.5 tabular-nums text-destructive">{displayNum(grandTotals.krankTage)}</td>
        <td className="border-l border-border/40"></td>
        <td></td>
      </tr>
    </tfoot>
  );
}
