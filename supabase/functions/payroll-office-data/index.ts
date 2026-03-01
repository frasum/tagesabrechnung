import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlapMinutes(shiftStart: number, shiftEnd: number, rangeStart: number, rangeEnd: number): number {
  return Math.max(0, Math.min(shiftEnd, rangeEnd) - Math.max(shiftStart, rangeStart));
}

function calculateShiftHours(startTime: string | null, endTime: string | null, isSundayOrHoliday: boolean) {
  if (!startTime || !endTime) return { totalHours: 0, sundayHolidayHours: 0, eveningHours: 0, nightHours: 0 };
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const totalMinutes = endMin > startMin ? endMin - startMin : (1440 - startMin) + endMin;
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  let eveningMinutes = 0;
  let nightMinutes = 0;
  if (endMin > startMin) {
    eveningMinutes = overlapMinutes(startMin, endMin, 1200, 1440);
  } else {
    eveningMinutes = overlapMinutes(startMin, 1440, 1200, 1440);
    nightMinutes = endMin;
  }

  return {
    totalHours,
    sundayHolidayHours: isSundayOrHoliday ? totalHours : 0,
    eveningHours: Math.round((eveningMinutes / 60) * 100) / 100,
    nightHours: Math.round((nightMinutes / 60) * 100) / 100,
  };
}

function isSunday(dateStr: string): boolean {
  return new Date(dateStr + "T12:00:00Z").getUTCDay() === 0;
}

async function validatePin(supabase: any, pin: string): Promise<boolean> {
  const { data } = await supabase
    .from("payroll_office_settings")
    .select("pin_code")
    .limit(1)
    .maybeSingle();
  return !!data && data.pin_code === pin;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { pin, action } = body;

    if (!pin) {
      return new Response(JSON.stringify({ error: "PIN fehlt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate PIN
    if (!(await validatePin(supabase, pin))) {
      return new Response(JSON.stringify({ error: "Falscher PIN" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- upsert_shift ----
    if (action === "upsert_shift") {
      const { employee_id, week_id, shift_date, start_time, end_time, absence_type, department, field } = body;

      if (!employee_id || !week_id || !shift_date) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Merge with existing shift if only one field changed
      const { data: existing } = await supabase
        .from("zt_shifts")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("shift_date", shift_date)
        .eq("department", department ?? "")
        .maybeSingle();

      let mergedStart: string | null;
      let mergedEnd: string | null;
      if (field) {
        mergedStart = field === "start_time" ? (start_time ?? null) : (existing?.start_time ?? null);
        mergedEnd = field === "end_time" ? (end_time ?? null) : (existing?.end_time ?? null);
      } else {
        mergedStart = start_time ?? null;
        mergedEnd = end_time ?? null;
      }

      const { data: holidayRow } = await supabase
        .from("bavarian_holidays")
        .select("id")
        .eq("holiday_date", shift_date)
        .maybeSingle();

      const isHoliday = !!holidayRow;
      const isSun = isSunday(shift_date);
      const hasAbsence = !!absence_type;

      const hours = hasAbsence
        ? { totalHours: 0, sundayHolidayHours: 0, eveningHours: 0, nightHours: 0 }
        : calculateShiftHours(mergedStart, mergedEnd, isSun || isHoliday);

      const { error } = await supabase.from("zt_shifts").upsert({
        employee_id,
        week_id,
        shift_date,
        start_time: hasAbsence ? null : mergedStart,
        end_time: hasAbsence ? null : mergedEnd,
        is_holiday: isHoliday,
        total_hours: hours.totalHours,
        sunday_holiday_hours: hours.sundayHolidayHours,
        evening_hours: hours.eveningHours,
        night_hours: hours.nightHours,
        absence_type: absence_type ?? null,
        department: department ?? "",
      }, { onConflict: "employee_id,shift_date,department" });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- upsert_note ----
    if (action === "upsert_note") {
      const { employee_id, field: noteField, value, period_ids } = body;

      if (!employee_id || !noteField) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["vorschuss", "besonderheiten", "urlaub_tage"].includes(noteField)) {
        return new Response(JSON.stringify({ error: "Ungültiges Feld" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert across all matching period IDs
      const targetPeriodIds = period_ids && period_ids.length > 0 ? period_ids : [];
      
      for (const periodId of targetPeriodIds) {
        const { data: existingNote } = await supabase
          .from("payroll_notes")
          .select("id")
          .eq("employee_id", employee_id)
          .eq("period_id", periodId)
          .maybeSingle();

        if (existingNote) {
          await supabase.from("payroll_notes")
            .update({ [noteField]: value })
            .eq("id", existingNote.id);
        } else {
          await supabase.from("payroll_notes").insert({
            employee_id,
            period_id: periodId,
            [noteField]: value,
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Default: load cumulated data ----
    const { period_start_date, period_end_date } = body;

    if (!period_start_date || !period_end_date) {
      return new Response(JSON.stringify({ error: "Datumsbereich fehlt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get all matching periods (with share_token) across all restaurants
    const { data: matchingPeriods } = await supabase
      .from("scheduling_periods")
      .select("*, restaurants!inner(name)")
      .eq("start_date", period_start_date)
      .eq("end_date", period_end_date)
      .not("share_token", "is", null);

    const allPeriodIds = (matchingPeriods ?? []).map((p: any) => p.id);

    if (!allPeriodIds.length) {
      return new Response(JSON.stringify({
        period: { label: "", start_date: period_start_date, end_date: period_end_date, status: "open" },
        weeks: [], shifts: [], employees: [], payrollNotes: [], advances: [], holidays: [],
        matchingPeriods: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use first period's label as representative
    const representativePeriod = matchingPeriods![0];
    
    // Check if any period is locked
    const isLocked = matchingPeriods!.every((p: any) => p.status === "locked");

    // 2. Get all weeks
    const { data: weeks } = await supabase
      .from("weeks")
      .select("*")
      .in("period_id", allPeriodIds)
      .order("week_number");

    const weekIds = (weeks ?? []).map((w: any) => w.id);

    // 3. Load shifts, employees, notes, advances, holidays in parallel
    const [shiftsRes, employeesRes, notesRes, advancesRes, holidaysRes] = await Promise.all([
      weekIds.length > 0
        ? supabase.from("zt_shifts").select("*").in("week_id", weekIds)
        : { data: [], error: null },
      supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, restaurant_id, staff!inner(id, name, perso_nr, first_name, last_name, nickname)")
        .not("zt_department", "is", null)
        .in("restaurant_id", (matchingPeriods ?? []).map((p: any) => p.restaurant_id).filter(Boolean)),
      supabase
        .from("payroll_notes")
        .select("*")
        .in("period_id", allPeriodIds),
      supabase
        .from("advances")
        .select("*, sessions!inner(session_date, restaurant_id)")
        .gte("sessions.session_date", period_start_date)
        .lte("sessions.session_date", period_end_date),
      supabase
        .from("bavarian_holidays")
        .select("holiday_date, name"),
    ]);

    // Deduplicate employees by id + department
    const seen = new Set<string>();
    const employees: any[] = [];
    for (const row of (employeesRes.data as any[] ?? [])) {
      const key = `${row.staff.id}-${row.zt_department}`;
      if (seen.has(key)) continue;
      seen.add(key);
      employees.push({
        id: row.staff.id,
        name: row.staff.name,
        perso_nr: row.staff.perso_nr,
        first_name: row.staff.first_name,
        last_name: row.staff.last_name,
        nickname: row.staff.nickname,
        department: row.zt_department,
        restaurant_id: row.restaurant_id,
      });
    }

    const advances = (advancesRes.data as any[] ?? []).map((d: any) => ({
      staff_name: d.staff_name,
      amount: d.amount,
      date: d.sessions.session_date,
      restaurant_id: d.sessions.restaurant_id,
    }));

    // Build weekToRestaurant mapping (week_id → restaurant_id via period)
    const periodToRestaurant: Record<string, string> = {};
    for (const p of (matchingPeriods ?? [])) {
      periodToRestaurant[p.id] = p.restaurant_id;
    }
    const weekToRestaurant: Record<string, string> = {};
    for (const w of (weeks ?? [])) {
      weekToRestaurant[w.id] = periodToRestaurant[w.period_id] ?? "";
    }

    // Deduplicate weeks by week_number
    const seenWeeks = new Set<number>();
    const deduplicatedWeeks: any[] = [];
    const weekNumberToAllIds: Record<number, string[]> = {};
    for (const w of (weeks ?? [])) {
      (weekNumberToAllIds[w.week_number] ??= []).push(w.id);
      if (seenWeeks.has(w.week_number)) continue;
      seenWeeks.add(w.week_number);
      deduplicatedWeeks.push(w);
    }

    return new Response(JSON.stringify({
      period: {
        label: representativePeriod.label,
        start_date: period_start_date,
        end_date: period_end_date,
        status: isLocked ? "locked" : "open",
      },
      weeks: deduplicatedWeeks,
      allWeekIds: weekIds,
      weekNumberToAllIds,
      weekToRestaurant,
      shifts: shiftsRes.data ?? [],
      employees,
      payrollNotes: notesRes.data ?? [],
      advances,
      holidays: holidaysRes.data ?? [],
      matchingPeriods: (matchingPeriods ?? []).map((p: any) => ({
        id: p.id,
        label: p.label,
        restaurant_name: p.restaurants?.name ?? "Unbekannt",
        restaurant_id: p.restaurant_id,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
