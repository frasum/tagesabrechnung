import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatHours, getSickDateRanges, formatSickRanges } from "@/lib/shiftCalculations";
import { displayNum } from "./utils";
import type { EmployeeTotals, EmployeeWithDepartment, PayrollNote, Shift } from "./types";

interface BuchhaltungRowProps {
  emp: EmployeeWithDepartment;
  totals: EmployeeTotals;
  note: PayrollNote | undefined;
  shifts: Shift[];
  isEven: boolean;
  onUpsertNote: (params: { employee_id: string; field: string; value: any }) => void;
}

export default function BuchhaltungRow({ emp, totals, note, shifts, isEven, onUpsertNote }: BuchhaltungRowProps) {
  const rowBg = isEven ? "bg-muted/30" : "";

  return (
    <tr className={`border-t border-border/50 hover:bg-primary/5 transition-colors ${rowBg}`}>
      <td className="px-2 py-1.5 font-medium whitespace-nowrap">
        {emp.first_name || emp.last_name ? `${emp.first_name} ${emp.last_name}`.trim() : emp.name}{emp.nickname ? ` (${emp.nickname})` : ""}{" "}
        <span className="text-xs text-muted-foreground tabular-nums">· {emp.perso_nr}</span>
      </td>
      <td className="text-center px-1 py-1.5 font-semibold tabular-nums bg-primary/5 border-l border-border/40">
        {formatHours(totals.gesamt)}
      </td>
      <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.schichten)}</td>
      <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.soFei, formatHours)}</td>
      <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.evening, formatHours)}</td>
      <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.night, formatHours)}</td>
      <td className="text-center px-1 py-1.5 tabular-nums text-green-600 font-medium border-l border-border/40">
        {totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace('.', ',') : "–"}
      </td>
      <td className="text-center px-1 py-1.5 tabular-nums text-destructive font-medium">
        {totals.krankTage > 0 ? (
          <SickDaysCell empShifts={shifts} krankTage={totals.krankTage} />
        ) : "–"}
      </td>
      <td className="p-1 border-l border-border/40">
        <Input
          type="text"
          inputMode="numeric"
          className="h-7 text-xs w-[65px] mx-auto text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          defaultValue={note?.vorschuss ?? 0}
          onBlur={(e) => onUpsertNote({ employee_id: emp.id, field: "vorschuss", value: Number(e.target.value) })}
        />
      </td>
      <td className="p-1">
        <Textarea
          className="text-xs min-h-[28px] h-7 resize-none"
          defaultValue={note?.besonderheiten ?? ""}
          onBlur={(e) => onUpsertNote({ employee_id: emp.id, field: "besonderheiten", value: e.target.value })}
        />
      </td>
    </tr>
  );
}

function SickDaysCell({ empShifts, krankTage }: { empShifts: Shift[]; krankTage: number }) {
  const ranges = getSickDateRanges(empShifts);
  const formatted = formatSickRanges(ranges);
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted underline-offset-2">
          {krankTage}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto min-w-[120px] p-3 text-xs" side="top">
        <p className="font-semibold mb-1">Krankheitszeiträume</p>
        {formatted.map((r, i) => (
          <p key={i}>{r}</p>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}
