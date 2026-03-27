import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurants } from "@/hooks/useRestaurant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calculator, Info, AlertTriangle, Users } from "lucide-react";
import { SFN_RATES } from "@/lib/sfnRates";
import type { SfnMode } from "@/hooks/useSfnMode";

interface BatchResult {
  restaurantName: string;
  restaurantId: string;
  staffId: string;
  staffName: string;
  persoNr: number | null;
  department: string;
  hours: number;
  hourlyRate: number;
  gross: number;
  net: number;
  sfnBonus: number;
  payout: number;
  agCost: number;
  source: "api" | "fallback";
  warning?: string;
}

interface BatchPayrollCalculationProps {
  dateFrom: string;
  dateTo: string;
  sfnMode: SfnMode;
  holidays: Map<string, number> | undefined;
  calculationYear?: number;
  calculationMonth?: number;
  onSelectEmployee?: (staffId: string) => void;
}

interface SfnShiftRow {
  total_hours: number;
  night_hours: number;
  night_deep_hours: number;
  sunday_holiday_hours: number;
  is_holiday: boolean;
  evening_hours: number;
  shift_date: string;
}

function aggregateSimple(data: SfnShiftRow[]) {
  const agg = { total: 0, night: 0, nightDeep: 0, sunday: 0, evening: 0, sundayEvening: 0, sundayNightDeep: 0 };
  for (const s of data) {
    agg.total += s.total_hours || 0;
    agg.night += s.night_hours || 0;
    agg.nightDeep += s.night_deep_hours || 0;
    agg.evening += s.evening_hours || 0;
    const isSundayOrHoliday = (s.sunday_holiday_hours || 0) > 0;
    if (isSundayOrHoliday) {
      agg.sundayEvening += s.evening_hours || 0;
      agg.sundayNightDeep += s.night_deep_hours || 0;
    }
    agg.sunday += s.sunday_holiday_hours || 0;
  }
  const rawNight25 = (agg.evening - agg.sundayEvening) + Math.max(0, (agg.night - agg.nightDeep));
  const rawNight40 = agg.nightDeep - agg.sundayNightDeep;
  return {
    totalHours: Math.round(agg.total * 100) / 100,
    night25Hours: Math.round(Math.max(0, rawNight25) * 100) / 100,
    night40Hours: Math.round(Math.max(0, rawNight40) * 100) / 100,
    sundayHours: Math.round(agg.sunday * 100) / 100,
    holidayHours: 0,
    holiday150Hours: 0,
  };
}

function aggregateExtended(data: SfnShiftRow[], hols: Map<string, number>) {
  const agg = { total: 0, night: 0, nightDeep: 0, evening: 0, sunday: 0, holiday: 0, holiday150: 0 };
  for (const s of data) {
    agg.total += s.total_hours || 0;
    agg.night += s.night_hours || 0;
    agg.nightDeep += s.night_deep_hours || 0;
    agg.evening += s.evening_hours || 0;
    const soFeiHours = s.sunday_holiday_hours || 0;
    if (soFeiHours > 0) {
      if (s.is_holiday && hols) {
        const rate = hols.get(s.shift_date) ?? 1.25;
        if (rate >= 1.50) agg.holiday150 += soFeiHours;
        else agg.holiday += soFeiHours;
      } else {
        agg.sunday += soFeiHours;
      }
    }
  }
  const night25 = agg.evening + Math.max(0, agg.night - agg.nightDeep);
  const night40 = agg.nightDeep;
  return {
    totalHours: Math.round(agg.total * 100) / 100,
    night25Hours: Math.round(Math.max(0, night25) * 100) / 100,
    night40Hours: Math.round(Math.max(0, night40) * 100) / 100,
    sundayHours: Math.round(agg.sunday * 100) / 100,
    holidayHours: Math.round(agg.holiday * 100) / 100,
    holiday150Hours: Math.round(agg.holiday150 * 100) / 100,
  };
}

const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function BatchPayrollCalculation({
  dateFrom,
  dateTo,
  sfnMode,
  holidays,
  calculationYear,
  calculationMonth,
  onSelectEmployee,
}: BatchPayrollCalculationProps) {
  const { data: restaurants = [] } = useRestaurants();
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchCalculating, setBatchCalculating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchError, setBatchError] = useState<string | null>(null);

  const isExtended = sfnMode === "extended";

  const handleBatchCalculate = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setBatchCalculating(true);
    setBatchResults([]);
    setBatchError(null);
    setBatchProgress({ current: 0, total: 0 });

    try {
      // 1. Load all staff_restaurants with staff details for ALL restaurants
      const { data: allStaffRest, error: srErr } = await supabase
        .from("staff_restaurants")
        .select("staff_id, restaurant_id, zt_hourly_rate, zt_department, staff!inner(name, perso_nr, tax_class, health_insurance, is_sv_exempt, hourly_rate, is_active)")
        .limit(5000);

      if (srErr) throw srErr;

      // Filter to active staff only
      const activeStaffRest = (allStaffRest || []).filter((sr: any) => sr.staff?.is_active === true);

      // 2. Load all zt_shifts in date range
      const { data: allShifts, error: shiftErr } = await supabase
        .from("zt_shifts")
        .select("employee_id, total_hours, night_hours, night_deep_hours, sunday_holiday_hours, is_holiday, evening_hours, shift_date")
        .gte("shift_date", dateFrom)
        .lte("shift_date", dateTo)
        .is("absence_type", null)
        .limit(5000);

      if (shiftErr) throw shiftErr;

      // Group shifts by employee_id
      const shiftsByEmployee = new Map<string, SfnShiftRow[]>();
      for (const s of allShifts || []) {
        const arr = shiftsByEmployee.get(s.employee_id) || [];
        arr.push(s as SfnShiftRow);
        shiftsByEmployee.set(s.employee_id, arr);
      }

      // Build restaurant name map
      const restMap = new Map(restaurants.map(r => [r.id, r.name]));

      // 3. Build list of calculations needed
      const calcList: Array<{
        staffId: string;
        staffName: string;
        persoNr: number | null;
        restaurantId: string;
        restaurantName: string;
        department: string;
        hourlyRate: number;
        taxClass: string;
        insuranceType: string;
        isSvExempt: boolean;
        shifts: SfnShiftRow[];
      }> = [];

      for (const sr of activeStaffRest) {
        const staff = sr.staff as any;
        const hrRate = (sr.zt_hourly_rate || 0) > 0 ? sr.zt_hourly_rate : (staff.hourly_rate || 0);
        const shifts = shiftsByEmployee.get(sr.staff_id) || [];

        calcList.push({
          staffId: sr.staff_id,
          staffName: staff.name,
          persoNr: staff.perso_nr,
          restaurantId: sr.restaurant_id,
          restaurantName: restMap.get(sr.restaurant_id) || "Unbekannt",
          department: sr.zt_department || "",
          hourlyRate: hrRate,
          taxClass: staff.tax_class || "I",
          insuranceType: staff.health_insurance === "privat" ? "privat" : "gesetzlich",
          isSvExempt: staff.is_sv_exempt === true,
          shifts,
        });
      }

      // Sort by restaurant, then name
      calcList.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName) || a.staffName.localeCompare(b.staffName));

      setBatchProgress({ current: 0, total: calcList.length });

      // 4. Calculate sequentially
      const results: BatchResult[] = [];
      for (let i = 0; i < calcList.length; i++) {
        const item = calcList[i];
        setBatchProgress({ current: i + 1, total: calcList.length });

        if (!item.hourlyRate || item.hourlyRate <= 0) {
          results.push({
            restaurantName: item.restaurantName,
            restaurantId: item.restaurantId,
            staffId: item.staffId,
            staffName: item.staffName,
            persoNr: item.persoNr,
            department: item.department,
            hours: 0,
            hourlyRate: 0,
            gross: 0,
            net: 0,
            sfnBonus: 0,
            payout: 0,
            agCost: 0,
            source: "fallback",
            warning: "Kein Stundenlohn hinterlegt",
          });
          continue;
        }

        // Aggregate SFN hours
        const sfnAgg = isExtended
          ? aggregateExtended(item.shifts, holidays ?? new Map())
          : aggregateSimple(item.shifts);

        const totalHours = sfnAgg.totalHours;
        const gross = Math.round(item.hourlyRate * totalHours * 100) / 100;

        if (totalHours <= 0) {
          results.push({
            restaurantName: item.restaurantName,
            restaurantId: item.restaurantId,
            staffId: item.staffId,
            staffName: item.staffName,
            persoNr: item.persoNr,
            department: item.department,
            hours: 0,
            hourlyRate: item.hourlyRate,
            gross: 0,
            net: 0,
            sfnBonus: 0,
            payout: 0,
            agCost: 0,
            source: "fallback",
            warning: "Keine Schichten im Zeitraum",
          });
          continue;
        }

        try {
          const payload = {
            grossMonthly: gross,
            hourlyRate: item.hourlyRate,
            monthlyHours: totalHours,
            taxClass: item.taxClass,
            state: "Bayern",
            churchTax: false,
            insuranceType: item.insuranceType,
            childAllowances: 0,
            isSvExempt: item.isSvExempt,
            sfnHours: {
              night25: sfnAgg.night25Hours,
              night40: sfnAgg.night40Hours,
              sunday: sfnAgg.sundayHours,
              holiday: sfnAgg.holidayHours,
              holiday150: sfnAgg.holiday150Hours,
            },
            sfnHourlyRate: item.hourlyRate,
            calculationYear,
            calculationMonth,
          };

          const { data, error: fnErr } = await supabase.functions.invoke("calculate-payroll", {
            body: payload,
          });

          if (fnErr) throw fnErr;

          const sfnBonus = data.sfn?.totalBonus ?? 0;
          results.push({
            restaurantName: item.restaurantName,
            restaurantId: item.restaurantId,
            staffId: item.staffId,
            staffName: item.staffName,
            persoNr: item.persoNr,
            department: item.department,
            hours: totalHours,
            hourlyRate: item.hourlyRate,
            gross: data.grossMonthly,
            net: data.netMonthly,
            sfnBonus,
            payout: data.netMonthly + sfnBonus,
            agCost: data.employerTotal,
            source: data.source ?? "fallback",
          });
        } catch {
          results.push({
            restaurantName: item.restaurantName,
            restaurantId: item.restaurantId,
            staffId: item.staffId,
            staffName: item.staffName,
            persoNr: item.persoNr,
            department: item.department,
            hours: totalHours,
            hourlyRate: item.hourlyRate,
            gross,
            net: 0,
            sfnBonus: 0,
            payout: 0,
            agCost: 0,
            source: "fallback",
            warning: "Berechnungsfehler",
          });
        }

        // Small delay to avoid rate-limiting
        if (i < calcList.length - 1) {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      setBatchResults(results);
    } catch (e: any) {
      setBatchError(e.message || "Fehler bei Batch-Berechnung");
    } finally {
      setBatchCalculating(false);
    }
  }, [dateFrom, dateTo, isExtended, holidays, restaurants, calculationYear, calculationMonth]);

  // Group results by restaurant
  const groupedResults = batchResults.reduce<Record<string, BatchResult[]>>((acc, r) => {
    (acc[r.restaurantName] = acc[r.restaurantName] || []).push(r);
    return acc;
  }, {});

  const grandTotals = batchResults.reduce(
    (acc, r) => ({
      hours: acc.hours + r.hours,
      gross: acc.gross + r.gross,
      net: acc.net + r.net,
      sfn: acc.sfn + r.sfnBonus,
      payout: acc.payout + r.payout,
      agCost: acc.agCost + r.agCost,
    }),
    { hours: 0, gross: 0, net: 0, sfn: 0, payout: 0, agCost: 0 }
  );

  const progressPercent = batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Batch-Berechnung (alle Restaurants)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Berechnet Brutto/Netto für alle Mitarbeiter aller Restaurants im gewählten Zeitraum.
            Standardwerte: Kinderfreibeträge 0, keine Kirchensteuer, Bundesland Bayern.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleBatchCalculate}
            disabled={batchCalculating || !dateFrom || !dateTo}
            size="lg"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {batchCalculating
              ? `Berechne ${batchProgress.current}/${batchProgress.total}...`
              : "Alle Mitarbeiter berechnen"}
          </Button>
          {dateFrom && dateTo && (
            <span className="text-sm text-muted-foreground">
              {new Date(dateFrom).toLocaleDateString("de-DE")} – {new Date(dateTo).toLocaleDateString("de-DE")}
            </span>
          )}
        </div>

        {batchCalculating && (
          <Progress value={progressPercent} className="h-2" />
        )}

        {batchError && (
          <Alert variant="destructive">
            <AlertDescription>{batchError}</AlertDescription>
          </Alert>
        )}

        {batchResults.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedResults).map(([restName, items]) => {
              const subtotals = items.reduce(
                (acc, r) => ({
                  hours: acc.hours + r.hours,
                  gross: acc.gross + r.gross,
                  net: acc.net + r.net,
                  sfn: acc.sfn + r.sfnBonus,
                  payout: acc.payout + r.payout,
                  agCost: acc.agCost + r.agCost,
                }),
                { hours: 0, gross: 0, net: 0, sfn: 0, payout: 0, agCost: 0 }
              );

              return (
                <div key={restName}>
                  <h3 className="font-semibold text-sm mb-2">{restName}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-2">Mitarbeiter</th>
                          <th className="text-left py-2 px-2">Abt.</th>
                          <th className="text-right py-2 px-2">Std.</th>
                          <th className="text-right py-2 px-2">€/h</th>
                          <th className="text-right py-2 px-2">Brutto</th>
                          <th className="text-right py-2 px-2">Netto</th>
                          <th className="text-right py-2 px-2">SFN</th>
                          <th className="text-right py-2 px-2">Auszahlung</th>
                          <th className="text-right py-2 pl-2">AG-Kosten</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {items.map((r) => (
                          <tr
                            key={`${r.restaurantId}-${r.staffId}`}
                            className={`hover:bg-muted/50 ${onSelectEmployee ? "cursor-pointer" : ""} ${r.warning ? "opacity-60" : ""}`}
                            onClick={() => onSelectEmployee?.(r.staffId)}
                          >
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-1.5">
                                {r.staffName}
                                {r.persoNr && <span className="text-xs text-muted-foreground">({r.persoNr})</span>}
                                {r.warning && (
                                  <span title={r.warning}>
                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-xs text-muted-foreground">{r.department}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{r.hours > 0 ? r.hours.toFixed(2).replace(".", ",") : "—"}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{r.hourlyRate > 0 ? fmt(r.hourlyRate) : "—"}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{r.gross > 0 ? fmt(r.gross) : "—"}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{r.net > 0 ? fmt(r.net) : "—"}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{r.sfnBonus > 0 ? fmt(r.sfnBonus) : "—"}</td>
                            <td className="py-2 px-2 text-right tabular-nums font-medium">{r.payout > 0 ? fmt(r.payout) : "—"}</td>
                            <td className="py-2 pl-2 text-right tabular-nums">{r.agCost > 0 ? fmt(r.agCost) : "—"}</td>
                          </tr>
                        ))}
                        {/* Subtotal */}
                        <tr className="font-semibold border-t border-border bg-muted/30">
                          <td className="py-2 pr-2" colSpan={2}>Summe {restName}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{subtotals.hours.toFixed(2).replace(".", ",")}</td>
                          <td className="py-2 px-2"></td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmt(subtotals.gross)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmt(subtotals.net)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmt(subtotals.sfn)}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmt(subtotals.payout)}</td>
                          <td className="py-2 pl-2 text-right tabular-nums">{fmt(subtotals.agCost)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Grand total */}
            {Object.keys(groupedResults).length > 1 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr className="font-bold border-t-2 border-border">
                      <td className="py-3 pr-2" colSpan={2}>Gesamt</td>
                      <td className="py-3 px-2 text-right tabular-nums">{grandTotals.hours.toFixed(2).replace(".", ",")}</td>
                      <td className="py-3 px-2"></td>
                      <td className="py-3 px-2 text-right tabular-nums">{fmt(grandTotals.gross)}</td>
                      <td className="py-3 px-2 text-right tabular-nums">{fmt(grandTotals.net)}</td>
                      <td className="py-3 px-2 text-right tabular-nums">{fmt(grandTotals.sfn)}</td>
                      <td className="py-3 px-2 text-right tabular-nums">{fmt(grandTotals.payout)}</td>
                      <td className="py-3 pl-2 text-right tabular-nums">{fmt(grandTotals.agCost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">{batchResults.length} Mitarbeiter</Badge>
              {batchResults.filter(r => r.warning).length > 0 && (
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {batchResults.filter(r => r.warning).length} mit Hinweis
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
