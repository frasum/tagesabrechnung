import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatHours, getSickDateRanges, getVacationDateRanges, formatSickRanges } from "@/lib/shiftCalculations";
import { displayNum } from "./utils";
import type { EmployeeTotals, PayrollNote, Shift, AdvanceEntry } from "./types";
import type { RestaurantEmployee } from "@/hooks/useRestaurantEmployees";
import type { SfnMode } from "@/hooks/useSfnMode";
import { format, parseISO } from "date-fns";

interface BuchhaltungRowProps {
  emp: RestaurantEmployee;
  totals: EmployeeTotals;
  note: PayrollNote | undefined;
  shifts: Shift[];
  advances: AdvanceEntry[];
  isEven: boolean;
  isLocked?: boolean;
  sfnMode?: SfnMode;
  showSfn?: boolean;
  showCommission?: boolean;
  commission?: number;
  onUpsertNote: (params: { employee_id: string; field: string; value: any }) => void;
}

export default function BuchhaltungRow({ emp, totals, note, shifts, advances, isEven, isLocked, sfnMode = "simple", showSfn = true, showCommission = false, commission = 0, onUpsertNote }: BuchhaltungRowProps) {
  const rowBg = isEven ? "bg-muted/30" : "";
  const isExtended = sfnMode === "extended";

  const advanceSum = advances.reduce((s, a) => s + a.amount, 0);
  const advanceText = advances
    .map(a => `Vorschuss ${format(parseISO(a.date), "dd.MM.")}: ${a.amount.toFixed(2).replace(".", ",")} €`)
    .join("; ");

  const vorschussValue = advanceSum > 0 ? advanceSum : (note?.vorschuss ?? 0);
  const vacRanges = getVacationDateRanges(shifts);
  const vacText = vacRanges.length > 0 ? `U: ${formatSickRanges(vacRanges).join(", ")}` : "";
  const besonderheitenValue = [advanceText, vacText, note?.besonderheiten].filter(Boolean).join(" | ");

  const effectiveNickname = emp.nickname || 
    (emp.name && emp.name !== emp.first_name && emp.name !== emp.last_name ? emp.name : null);
  const nicknameAlreadyInName = effectiveNickname && (emp.first_name?.includes(effectiveNickname) || emp.last_name?.includes(effectiveNickname));
  const nameBase = emp.first_name || emp.last_name
    ? [emp.first_name, effectiveNickname && !nicknameAlreadyInName ? `(${effectiveNickname})` : null, emp.last_name].filter(Boolean).join(" ")
    : emp.name;
  const persoStr = emp.perso_nr && emp.perso_nr > 0 ? String(emp.perso_nr) : "";

  return (
    <tr className={`border-t border-border/50 hover:bg-primary/5 transition-colors ${rowBg}`}>
      <td className="px-2 py-1.5 font-medium whitespace-nowrap">
        {nameBase}
        {persoStr && <span className="text-xs text-muted-foreground ml-1">{persoStr}</span>}
      </td>
      <td className="text-center px-1 py-1.5 font-semibold tabular-nums bg-primary/5 border-l border-border/40">
        {formatHours(totals.gesamt)}
      </td>
      <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.schichten)}</td>
      {showSfn && <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.evening, formatHours)}</td>}
      {showSfn && <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.night, formatHours)}</td>}
      {showSfn && (isExtended ? (
        <>
          <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.sonntagStunden, formatHours)}</td>
          <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.feiertagStunden, formatHours)}</td>
        </>
      ) : (
        <td className="text-center px-1 py-1.5 tabular-nums">{displayNum(totals.soFeiStunden, formatHours)}</td>
      ))}
      <td className="text-center px-1 py-1.5 tabular-nums text-green-600 font-medium border-l border-border/40">
        {totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace('.', ',') : "–"}
      </td>
      <td className="text-center px-1 py-1.5 tabular-nums text-destructive font-medium">
        {totals.krankTage > 0 ? (
          <SickDaysCell empShifts={shifts} krankTage={totals.krankTage} />
        ) : "–"}
      </td>
      {showCommission && (
        <td className="text-center px-1 py-1.5 tabular-nums font-medium text-amber-600 border-l border-border/40">
          {commission > 0 ? commission.toFixed(2).replace(".", ",") + " €" : "–"}
        </td>
      )}
      <td className="p-1 border-l border-border/40">
        <Input
          type="text"
          inputMode="numeric"
          className="time-input-clean h-7 text-xs w-[65px] mx-auto text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          defaultValue={vorschussValue}
          disabled={isLocked || advanceSum > 0}
          onBlur={(e) => onUpsertNote({ employee_id: emp.id, field: "vorschuss", value: Number(e.target.value) })}
        />
      </td>
      <td className="p-1">
        {isLocked ? (
          <div className="text-xs whitespace-pre-wrap break-words min-h-[28px] py-1 px-2">
            {besonderheitenValue || "–"}
          </div>
        ) : (
          <AutoExpandTextarea
            defaultValue={besonderheitenValue}
            onBlur={(e) => onUpsertNote({ employee_id: emp.id, field: "besonderheiten", value: e.target.value })}
          />
        )}
      </td>
    </tr>
  );
}

function AutoExpandTextarea({ defaultValue, onBlur }: { defaultValue: string; onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  return (
    <Textarea
      ref={ref}
      className="time-input-clean text-xs min-h-[28px] h-auto resize-none overflow-hidden"
      defaultValue={defaultValue}
      onInput={(e) => autoResize(e.currentTarget)}
      onBlur={onBlur}
      onFocus={(e) => autoResize(e.currentTarget)}
    />
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
