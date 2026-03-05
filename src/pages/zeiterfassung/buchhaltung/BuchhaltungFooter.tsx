import { formatHours } from "@/lib/shiftCalculations";
import { displayNum } from "./utils";
import type { EmployeeTotals } from "./types";
import type { SfnMode } from "@/hooks/useSfnMode";

interface BuchhaltungFooterProps {
  grandTotals: EmployeeTotals;
  sfnMode?: SfnMode;
  showSfn?: boolean;
}

export default function BuchhaltungFooter({ grandTotals, sfnMode = "simple", showSfn = true }: BuchhaltungFooterProps) {
  const isExtended = sfnMode === "extended";

  return (
    <tfoot>
      <tr className="bg-muted/60 border-t-2 border-border font-bold text-sm sticky bottom-0">
        <td className="px-2 py-2.5 uppercase tracking-wide text-muted-foreground">Gesamt</td>
        <td className="text-center px-1 py-2.5 tabular-nums bg-primary/10 border-l border-border/40">{formatHours(grandTotals.gesamt)}</td>
        <td className="text-center px-1 py-2.5 tabular-nums">{grandTotals.schichten}</td>
        {showSfn && <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.evening, formatHours)}</td>}
        {showSfn && <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.night, formatHours)}</td>}
        {showSfn && (isExtended ? (
          <>
            <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.sonntagStunden, formatHours)}</td>
            <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.feiertagStunden, formatHours)}</td>
          </>
        ) : (
          <td className="text-center px-1 py-2.5 tabular-nums">{displayNum(grandTotals.soFeiStunden, formatHours)}</td>
        ))}
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
