import React, { useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRestaurants } from "@/hooks/useRestaurant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calculator, Info, AlertTriangle, Users, Download, Save, Trash2, FolderOpen, Paperclip, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
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

interface ExternalEmployee {
  name: string;
  perso_nr: number | null;
  brutto: number | null;
  netto: number | null;
  sfn: number | null;
  auszahlung: number | null;
  stunden: number | null;
  stundenlohn: number | null;
}

interface BatchPayrollCalculationProps {
  dateFrom: string;
  dateTo: string;
  sfnMode: SfnMode;
  holidays: Map<string, number> | undefined;
  calculationYear?: number;
  calculationMonth?: number;
  onSelectEmployee?: (staffId: string) => void;
  periodId?: string;
  periodLabel?: string;
}

interface SfnShiftRow {
  total_hours: number;
  night_hours: number;
  night_deep_hours: number;
  sunday_holiday_hours: number;
  is_holiday: boolean;
  evening_hours: number;
  shift_date: string;
  absence_type?: string | null;
}

function aggregateSimple(data: SfnShiftRow[]) {
  const agg = { total: 0, night: 0, nightDeep: 0, sunday: 0, evening: 0, sundayEvening: 0, sundayNightDeep: 0 };
  for (const s of data) {
    agg.total += s.total_hours || 0;
    // Absence rows (Urlaub, Feiertag, Krank) contribute hours but no SFN surcharges
    if (s.absence_type) continue;
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
    // Absence rows contribute hours but no SFN surcharges
    if (s.absence_type) continue;
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

/** Normalize a name for fuzzy matching */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match external employees to internal results — primarily by perso_nr, fallback to name */
function matchExternal(
  internalResults: BatchResult[],
  externalEmployees: ExternalEmployee[]
): Map<string, ExternalEmployee> {
  const matched = new Map<string, ExternalEmployee>();
  const usedExternal = new Set<number>();

  // Pass 1: Match by perso_nr (exact)
  for (const r of internalResults) {
    if (r.persoNr == null) continue;
    for (let i = 0; i < externalEmployees.length; i++) {
      if (usedExternal.has(i)) continue;
      if (externalEmployees[i].perso_nr != null && externalEmployees[i].perso_nr === r.persoNr) {
        matched.set(r.staffId, externalEmployees[i]);
        usedExternal.add(i);
        break;
      }
    }
  }

  // Pass 2: Fallback — name matching for remaining unmatched
  for (const r of internalResults) {
    if (matched.has(r.staffId)) continue;
    const normInternal = normalizeName(r.staffName);
    const internalParts = normInternal.split(" ");

    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < externalEmployees.length; i++) {
      if (usedExternal.has(i)) continue;
      const normExt = normalizeName(externalEmployees[i].name);

      if (normExt === normInternal) {
        bestIdx = i;
        bestScore = 100;
        break;
      }

      const extParts = normExt.split(" ");
      const forwardMatch = internalParts.filter(p => extParts.some(ep => ep.includes(p) || p.includes(ep))).length;
      const score = forwardMatch / Math.max(internalParts.length, extParts.length);

      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      matched.set(r.staffId, externalEmployees[bestIdx]);
      usedExternal.add(bestIdx);
    }
  }

  return matched;
}

export default function BatchPayrollCalculation({
  dateFrom,
  dateTo,
  sfnMode,
  holidays,
  calculationYear,
  calculationMonth,
  onSelectEmployee,
  periodId,
  periodLabel,
}: BatchPayrollCalculationProps) {
  const { data: restaurants = [] } = useRestaurants();
  const queryClient = useQueryClient();
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchCalculating, setBatchCalculating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchError, setBatchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedSnapshotId, setLoadedSnapshotId] = useState<string | null>(null);
  const [uploadingPdfFor, setUploadingPdfFor] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCalcIdRef = useRef<string | null>(null);

  const isExtended = sfnMode === "extended";

  // Fetch saved calculations for the current period
  const { data: savedCalcs = [] } = useQuery({
    queryKey: ["payroll-calculations", periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_calculations")
        .select("id, label, sfn_mode, created_at, created_by_name, pdf_path, external_results")
        .eq("period_id", periodId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const handleSave = useCallback(async () => {
    if (!periodId || batchResults.length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("payroll_calculations").insert({
        period_id: periodId,
        sfn_mode: sfnMode,
        date_from: dateFrom,
        date_to: dateTo,
        label: periodLabel || null,
        results: batchResults as any,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["payroll-calculations", periodId] });
      toast.success("Berechnung gespeichert");
    } catch (e: any) {
      toast.error("Speichern fehlgeschlagen: " + (e.message || "Unbekannt"));
    } finally {
      setSaving(false);
    }
  }, [periodId, batchResults, sfnMode, dateFrom, dateTo, periodLabel, queryClient]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      // Also delete the PDF from storage if it exists
      const calc = savedCalcs.find(c => c.id === id);
      if (calc?.pdf_path) {
        await supabase.storage.from("payroll-pdfs").remove([calc.pdf_path]);
      }
      const { error } = await supabase.from("payroll_calculations").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["payroll-calculations", periodId] });
      if (loadedSnapshotId === id) {
        setLoadedSnapshotId(null);
        setBatchResults([]);
      }
      if (showComparison === id) setShowComparison(null);
      toast.success("Berechnung gelöscht");
    } catch (e: any) {
      toast.error("Löschen fehlgeschlagen: " + (e.message || "Unbekannt"));
    }
  }, [periodId, loadedSnapshotId, queryClient, savedCalcs, showComparison]);

  const handleLoadSnapshot = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("payroll_calculations")
        .select("results")
        .eq("id", id)
        .single();
      if (error) throw error;
      setBatchResults((data.results as any) || []);
      setLoadedSnapshotId(id);
      toast.success("Gespeicherte Berechnung geladen");
    } catch (e: any) {
      toast.error("Laden fehlgeschlagen: " + (e.message || "Unbekannt"));
    }
  }, []);

  const handlePdfUpload = useCallback((calcId: string) => {
    pendingCalcIdRef.current = calcId;
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const calcId = pendingCalcIdRef.current;
    if (!file || !calcId) return;
    e.target.value = "";

    if (file.type !== "application/pdf") {
      toast.error("Bitte nur PDF-Dateien hochladen");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Datei ist zu groß (max. 20 MB)");
      return;
    }

    setUploadingPdfFor(calcId);

    try {
      const pdfPath = `${calcId}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from("payroll-pdfs")
        .upload(pdfPath, file, { contentType: "application/pdf" });

      if (uploadErr) throw uploadErr;

      // Save path to DB
      await supabase
        .from("payroll_calculations")
        .update({ pdf_path: pdfPath } as any)
        .eq("id", calcId);

      toast.success("PDF hochgeladen – KI-Analyse läuft...");

      // Call edge function to parse
      const { data, error: fnErr } = await supabase.functions.invoke("parse-payroll-pdf", {
        body: { calculationId: calcId, pdfPath },
      });

      if (fnErr) throw fnErr;

      queryClient.invalidateQueries({ queryKey: ["payroll-calculations", periodId] });
      if (!data.count || data.count === 0) {
        toast.warning("Keine Mitarbeiter im PDF erkannt. Bitte prüfen Sie das PDF.");
      } else {
        toast.success(`${data.count} Mitarbeiter aus PDF erkannt`);
      }
      setShowComparison(calcId);
    } catch (e: any) {
      toast.error("PDF-Verarbeitung fehlgeschlagen: " + (e.message || "Unbekannt"));
    } finally {
      setUploadingPdfFor(null);
    }
  }, [periodId, queryClient]);

  const handleBatchCalculate = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setBatchCalculating(true);
    setBatchResults([]);
    setBatchError(null);
    setBatchProgress({ current: 0, total: 0 });

    try {
      const { data: allStaffRest, error: srErr } = await supabase
        .from("staff_restaurants")
        .select("staff_id, restaurant_id, zt_hourly_rate, zt_department, staff!inner(name, perso_nr, tax_class, health_insurance, is_sv_exempt, hourly_rate, is_active)")
        .limit(5000);

      if (srErr) throw srErr;

      const activeRaw = (allStaffRest || []).filter((sr: any) => sr.staff?.is_active === true);
      const restMap = new Map(restaurants.map(r => [r.id, r.name]));
      const dedupMap = new Map<string, any>();
      for (const sr of activeRaw) {
        const key = sr.staff_id;
        const existing = dedupMap.get(key);
        if (existing) {
          // Merge departments
          const existingDept = existing.zt_department || "";
          const newDept = sr.zt_department || "";
          if (newDept && !existingDept.includes(newDept)) {
            existing.zt_department = existingDept ? `${existingDept}, ${newDept}` : newDept;
          }
          // Merge restaurant names
          const restName = restMap.get(sr.restaurant_id) || "";
          const existingRestNames: string[] = existing._restaurant_names || [];
          if (restName && !existingRestNames.includes(restName)) {
            existingRestNames.push(restName);
            existing._restaurant_names = existingRestNames;
          }
          // Keep highest hourly rate
          if ((sr.zt_hourly_rate || 0) > (existing.zt_hourly_rate || 0)) {
            existing.zt_hourly_rate = sr.zt_hourly_rate;
          }
        } else {
          const restName = restMap.get(sr.restaurant_id) || "";
          dedupMap.set(key, { ...sr, _restaurant_names: restName ? [restName] : [] });
        }
      }
      const activeStaffRest = Array.from(dedupMap.values());

      const { data: allShifts, error: shiftErr } = await supabase
        .from("zt_shifts")
        .select("employee_id, total_hours, night_hours, night_deep_hours, sunday_holiday_hours, is_holiday, evening_hours, shift_date, absence_type")
        .gte("shift_date", dateFrom)
        .lte("shift_date", dateTo)
        .limit(5000);

      if (shiftErr) throw shiftErr;

      const shiftsByEmployee = new Map<string, SfnShiftRow[]>();
      for (const s of allShifts || []) {
        const arr = shiftsByEmployee.get(s.employee_id) || [];
        arr.push(s as SfnShiftRow);
        shiftsByEmployee.set(s.employee_id, arr);
      }

      

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
          restaurantName: (sr._restaurant_names || []).join(", ") || restMap.get(sr.restaurant_id) || "Unbekannt",
          department: sr.zt_department || "",
          hourlyRate: hrRate,
          taxClass: staff.tax_class || "I",
          insuranceType: staff.health_insurance === "privat" ? "privat" : "gesetzlich",
          isSvExempt: staff.is_sv_exempt === true,
          shifts,
        });
      }

      calcList.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName) || a.staffName.localeCompare(b.staffName));

      setBatchProgress({ current: 0, total: calcList.length });

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

  // Build comparison data for the currently shown comparison
  const comparisonData = useMemo(() => {
    if (!showComparison) return null;
    const calc = savedCalcs.find(c => c.id === showComparison);
    if (!calc?.external_results) return null;

    const internalResults: BatchResult[] = (calc as any).results_loaded || batchResults;
    const external = (calc.external_results as any as ExternalEmployee[]) || [];

    if (internalResults.length === 0) return { matched: new Map<string, ExternalEmployee>(), unmatched: external, results: internalResults };

    const matched = matchExternal(internalResults, external);
    const matchedNames = new Set(Array.from(matched.values()).map(e => e.name));
    const unmatched = external.filter(e => !matchedNames.has(e.name));

    return { matched, unmatched, results: internalResults };
  }, [showComparison, savedCalcs, batchResults]);

  const handleExcelExport = useCallback(async () => {
    if (batchResults.length === 0) return;
    try {
      const XLSX = await import("xlsx");
      const wsData: (string | number | null)[][] = [];

      wsData.push(["Mitarbeiter", "Perso-Nr", "Abt.", "Stunden", "€/h", "Brutto", "Netto", "SFN", "Auszahlung", "AG-Kosten", "Hinweis"]);

      const grouped = batchResults.reduce<Record<string, BatchResult[]>>((acc, r) => {
        (acc[r.restaurantName] = acc[r.restaurantName] || []).push(r);
        return acc;
      }, {});

      for (const [restName, items] of Object.entries(grouped)) {
        wsData.push([`RESTAURANT: ${restName}`, "", "", "", "", "", "", "", "", "", ""]);
        for (const r of items) {
          wsData.push([r.staffName, r.persoNr, r.department, r.hours, r.hourlyRate, r.gross, r.net, r.sfnBonus, r.payout, r.agCost, r.warning || ""]);
        }
        const sub = items.reduce((a, r) => ({
          hours: a.hours + r.hours, gross: a.gross + r.gross, net: a.net + r.net,
          sfn: a.sfn + r.sfnBonus, payout: a.payout + r.payout, agCost: a.agCost + r.agCost,
        }), { hours: 0, gross: 0, net: 0, sfn: 0, payout: 0, agCost: 0 });
        wsData.push([`Summe ${restName}`, "", "", sub.hours, "", sub.gross, sub.net, sub.sfn, sub.payout, sub.agCost, ""]);
        wsData.push([]);
      }

      wsData.push(["GESAMT", "", "", grandTotals.hours, "", grandTotals.gross, grandTotals.net, grandTotals.sfn, grandTotals.payout, grandTotals.agCost, ""]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Brutto-Netto");
      XLSX.writeFile(wb, `Brutto-Netto_${dateFrom}_${dateTo}.xlsx`);
      toast.success("Excel-Export erstellt");
    } catch (e: any) {
      toast.error("Excel-Export fehlgeschlagen: " + (e.message || "Unbekannter Fehler"));
    }
  }, [batchResults, grandTotals, dateFrom, dateTo]);

  const progressPercent = batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0;

  const handleShowComparison = useCallback(async (calcId: string) => {
    // Load results if not already the loaded snapshot
    if (loadedSnapshotId !== calcId) {
      try {
        const { data, error } = await supabase
          .from("payroll_calculations")
          .select("results")
          .eq("id", calcId)
          .single();
        if (error) throw error;
        setBatchResults((data.results as any) || []);
        setLoadedSnapshotId(calcId);
      } catch {
        // use current batchResults as fallback
      }
    }
    setShowComparison(showComparison === calcId ? null : calcId);
  }, [loadedSnapshotId, showComparison]);

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

        {/* Hidden file input for PDF upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileSelected}
        />

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
          {batchResults.length > 0 && (
            <>
              <Button variant="outline" size="lg" onClick={handleExcelExport}>
                <Download className="h-4 w-4 mr-2" />
                Excel Export
              </Button>
              {periodId && (
                <Button variant="outline" size="lg" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Speichere..." : "Speichern"}
                </Button>
              )}
            </>
          )}
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

        {/* Gespeicherte Berechnungen */}
        {savedCalcs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4" />
              Gespeicherte Berechnungen
            </h4>
            <div className="space-y-1">
              {savedCalcs.map((calc) => {
                const hasPdf = !!calc.pdf_path;
                const hasExternal = !!(calc.external_results as any)?.length;
                const isUploading = uploadingPdfFor === calc.id;

                return (
                  <div key={calc.id}>
                    <div
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${loadedSnapshotId === calc.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <button
                        className="flex-1 text-left hover:underline"
                        onClick={() => handleLoadSnapshot(calc.id)}
                      >
                        <span className="font-medium">{calc.label || "Berechnung"}</span>
                        <span className="text-muted-foreground ml-2">
                          ({new Date(calc.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })})
                        </span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {calc.sfn_mode === "extended" ? "§3b" : "Einfach"}
                        </Badge>
                      </button>
                      <div className="flex items-center gap-1">
                        {/* PDF upload / status */}
                        {isUploading ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </Button>
                        ) : hasExternal ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            onClick={() => handleShowComparison(calc.id)}
                            title="Vergleich anzeigen"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handlePdfUpload(calc.id)}
                            title="Lohnbüro-PDF hochladen"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(calc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Comparison view */}
                    {showComparison === calc.id && comparisonData && (
                      <div className="mt-2 ml-4 mr-1 rounded-md border border-border bg-muted/20 p-3 space-y-3">
                        <h5 className="text-sm font-semibold">Vergleich: Eigene vs. Lohnbüro</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-border text-muted-foreground">
                                <th className="text-left py-1.5 pr-2">Mitarbeiter</th>
                                <th className="text-right py-1.5 px-2">Stunden</th>
                                <th className="text-right py-1.5 px-2">€/h</th>
                                <th className="text-right py-1.5 px-2">Brutto</th>
                                <th className="text-right py-1.5 px-2">Netto</th>
                                <th className="text-right py-1.5 px-2">SFN</th>
                                <th className="text-right py-1.5 pl-2">Auszahlung</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comparisonData.results.map((r) => {
                                const ext = comparisonData.matched.get(r.staffId);
                                const fmtHours = (n: number) => n > 0 ? n.toFixed(2).replace(".", ",") : "—";

                                const metrics: { own: number; ext: number | null | undefined; isHours?: boolean }[] = [
                                  { own: r.hours, ext: ext?.stunden, isHours: true },
                                  { own: r.hourlyRate, ext: ext?.stundenlohn },
                                  { own: r.gross, ext: ext?.brutto },
                                  { own: r.net, ext: ext?.netto },
                                  { own: r.sfnBonus, ext: ext?.sfn },
                                  { own: r.payout, ext: ext?.auszahlung },
                                ];

                                const allMatch = ext && metrics.every(m =>
                                  m.ext != null && Math.abs(m.own - m.ext) <= 1
                                );

                                const renderDelta = (own: number, extVal: number | null | undefined, isHours?: boolean) => {
                                  if (extVal == null) return null;
                                  const diff = extVal - own;
                                  if (Math.abs(diff) <= (isHours ? 0.05 : 1)) {
                                    return <span className="text-green-600">✓</span>;
                                  }
                                  const arrow = diff > 0 ? "↑" : "↓";
                                  const color = diff > 0 ? "text-red-600" : "text-amber-600";
                                  const val = isHours
                                    ? Math.abs(diff).toFixed(2).replace(".", ",")
                                    : fmt(Math.abs(diff));
                                  return <span className={color}>{arrow} {val}</span>;
                                };

                                return (
                                  <React.Fragment key={`${r.restaurantId}-${r.staffId}`}>
                                    {/* Row 1: Own values */}
                                    <tr className="border-t border-border/50 hover:bg-muted/50">
                                      <td className="py-1.5 pr-2 align-top">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {ext && (
                                            <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${allMatch ? "bg-green-500" : "bg-amber-500"}`} />
                                          )}
                                          <span>{r.staffName}</span>
                                          {r.restaurantName && r.restaurantName.includes(",") && (
                                            <span className="inline-flex items-center rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">{r.restaurantName}</span>
                                          )}
                                          {!ext && <span className="text-muted-foreground">(kein Match)</span>}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-2 text-right tabular-nums">{fmtHours(r.hours)}</td>
                                      <td className="py-1.5 px-2 text-right tabular-nums">{r.hourlyRate > 0 ? fmt(r.hourlyRate) : "—"}</td>
                                      <td className="py-1.5 px-2 text-right tabular-nums">{r.gross > 0 ? fmt(r.gross) : "—"}</td>
                                      <td className="py-1.5 px-2 text-right tabular-nums">{r.net > 0 ? fmt(r.net) : "—"}</td>
                                      <td className="py-1.5 px-2 text-right tabular-nums">{r.sfnBonus > 0 ? fmt(r.sfnBonus) : "—"}</td>
                                      <td className="py-1.5 pl-2 text-right tabular-nums">{r.payout > 0 ? fmt(r.payout) : "—"}</td>
                                    </tr>
                                    {/* Row 2: Delta to payroll office (only if matched) */}
                                    {ext && (
                                      <tr className="hover:bg-muted/50">
                                        <td className="pb-1.5 pr-2 text-muted-foreground text-[10px]">Δ Lohnbüro</td>
                                        {metrics.map((m, i) => (
                                          <td key={i} className="pb-1.5 px-2 text-right tabular-nums text-[11px]">
                                            {renderDelta(m.own, m.ext, m.isHours)}
                                          </td>
                                        ))}
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                              {/* Summary row: total deviations */}
                              {(() => {
                                let totalOwnGross = 0, totalExtGross = 0, hasExt = false;
                                let totalOwnPayout = 0, totalExtPayout = 0;
                                comparisonData.results.forEach((r) => {
                                  const ext = comparisonData.matched.get(r.staffId);
                                  totalOwnGross += r.gross;
                                  totalOwnPayout += r.payout;
                                  if (ext?.brutto != null) { totalExtGross += ext.brutto; hasExt = true; }
                                  if (ext?.auszahlung != null) { totalExtPayout += ext.auszahlung; }
                                });
                                if (!hasExt) return null;
                                const diffGross = totalExtGross - totalOwnGross;
                                const diffPayout = totalExtPayout - totalOwnPayout;
                                return (
                                  <tr className="border-t-2 border-border font-semibold">
                                    <td className="py-2 pr-2">Gesamt-Δ</td>
                                    <td colSpan={2} />
                                    <td className={`py-2 px-2 text-right tabular-nums ${Math.abs(diffGross) > 1 ? "text-red-600" : "text-green-600"}`}>
                                      {Math.abs(diffGross) <= 1 ? "✓" : `${diffGross > 0 ? "↑" : "↓"} ${fmt(Math.abs(diffGross))}`}
                                    </td>
                                    <td />
                                    <td />
                                    <td className={`py-2 pl-2 text-right tabular-nums ${Math.abs(diffPayout) > 1 ? "text-red-600" : "text-green-600"}`}>
                                      {Math.abs(diffPayout) <= 1 ? "✓" : `${diffPayout > 0 ? "↑" : "↓"} ${fmt(Math.abs(diffPayout))}`}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Unmatched external employees */}
                        {comparisonData.unmatched.length > 0 && (
                          <div className="mt-2">
                            <h6 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Nicht zugeordnet (nur im Lohnbüro-PDF):
                            </h6>
                            <div className="space-y-0.5">
                              {comparisonData.unmatched.map((e, i) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                  {e.name}
                                  {e.brutto != null && <span className="ml-2">Brutto: {fmt(e.brutto)}</span>}
                                  {e.netto != null && <span className="ml-2">Netto: {fmt(e.netto)}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Re-upload option */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handlePdfUpload(calc.id)}
                          disabled={isUploading}
                        >
                          <Paperclip className="h-3 w-3 mr-1" />
                          Neues PDF hochladen
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {r.staffName}
                                {r.restaurantName && r.restaurantName.includes(",") && (
                                  <span className="inline-flex items-center rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">{r.restaurantName}</span>
                                )}
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
