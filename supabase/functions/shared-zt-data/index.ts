import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Shift hour calculation (mirrored from frontend shiftCalculations.ts) ----
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token fehlt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token
    const { data: period, error: periodError } = await supabase
      .from("scheduling_periods")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();

    if (periodError || !period) {
      return new Response(
        JSON.stringify({ error: "Ungültiger oder widerrufener Link" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST: update payroll_notes or upsert shift
    if (req.method === "POST") {
      const body = await req.json();
      const action = body.action || "upsert_note";

      // ---- upsert_shift ----
      if (action === "upsert_shift") {
        const { employee_id, week_id, shift_date, start_time, end_time, absence_type, department } = body;

        if (!employee_id || !week_id || !shift_date) {
          return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check period is not locked — find the period for this week
        // The week might belong to any of the matching periods
        const { data: weekRow } = await supabase
          .from("weeks")
          .select("id, period_id")
          .eq("id", week_id)
          .maybeSingle();

        if (!weekRow) {
          return new Response(JSON.stringify({ error: "Woche nicht gefunden" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify the week's period has the same date range as the token period
        const { data: weekPeriod } = await supabase
          .from("scheduling_periods")
          .select("*")
          .eq("id", weekRow.period_id)
          .maybeSingle();

        if (!weekPeriod || weekPeriod.start_date !== period.start_date || weekPeriod.end_date !== period.end_date || !weekPeriod.share_token) {
          return new Response(JSON.stringify({ error: "Woche gehört nicht zu einer freigegebenen Periode" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (weekPeriod.status === "locked") {
          return new Response(JSON.stringify({ error: "Periode ist gesperrt" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

        const field = body.field as string | undefined;
        let mergedStart: string | null;
        let mergedEnd: string | null;
        if (field) {
          mergedStart = field === "start_time" ? (start_time ?? null) : (existing?.start_time ?? null);
          mergedEnd = field === "end_time" ? (end_time ?? null) : (existing?.end_time ?? null);
        } else {
          mergedStart = start_time ?? null;
          mergedEnd = end_time ?? null;
        }

        // Check holidays
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

      // ---- upsert_note (default / backward compatible) ----
      // For notes, we need to find the correct period for the employee's restaurant
      const { employee_id, field, value, period_id: requestedPeriodId } = body;

      if (!employee_id || !field) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["vorschuss", "besonderheiten", "urlaub_tage"].includes(field)) {
        return new Response(JSON.stringify({ error: "Ungültiges Feld" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use requested period_id if provided, otherwise fall back to anchor period
      const targetPeriodId = requestedPeriodId || period.id;

      const { data: existingNote } = await supabase
        .from("payroll_notes")
        .select("id")
        .eq("employee_id", employee_id)
        .eq("period_id", targetPeriodId)
        .maybeSingle();

      if (existingNote) {
        const { error } = await supabase
          .from("payroll_notes")
          .update({ [field]: value })
          .eq("id", existingNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_notes").insert({
          employee_id,
          period_id: targetPeriodId,
          [field]: value,
        });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: return all data across matching periods
    const anchorRestaurantId = period.restaurant_id;

    // Find all periods with same date range that also have a share_token
    const { data: allMatchingPeriods } = await supabase
      .from("scheduling_periods")
      .select("*, restaurants!scheduling_periods_restaurant_id_fkey(id, name)")
      .eq("start_date", period.start_date)
      .eq("end_date", period.end_date)
      .not("share_token", "is", null);

    const matchingPeriods = (allMatchingPeriods ?? [period]).map((p: any) => ({
      id: p.id,
      restaurant_id: p.restaurant_id,
      restaurant_name: p.restaurants?.name ?? "Unbekannt",
      status: p.status,
    }));

    const allPeriodIds = matchingPeriods.map((p: any) => p.id);
    const allRestaurantIds = [...new Set(matchingPeriods.map((p: any) => p.restaurant_id).filter(Boolean))];

    // Build period_id -> restaurant_id mapping
    const periodToRestaurant: Record<string, string> = {};
    for (const p of matchingPeriods) {
      if (p.restaurant_id) periodToRestaurant[p.id] = p.restaurant_id;
    }

    const { data: weeks } = await supabase
      .from("weeks")
      .select("*")
      .in("period_id", allPeriodIds)
      .order("week_number");

    const weekIds = (weeks ?? []).map((w: any) => w.id);

    // Build week_id -> restaurant_id mapping (via period)
    const weekToRestaurant: Record<string, string> = {};
    for (const w of weeks ?? []) {
      weekToRestaurant[w.id] = periodToRestaurant[w.period_id] ?? "";
    }

    // Build weekNumberToAllIds
    const weekNumberToAllIds: Record<number, string[]> = {};
    for (const w of weeks ?? []) {
      (weekNumberToAllIds[w.week_number] ??= []).push(w.id);
    }

    // Deduplicate weeks by week_number (take first)
    const seenWeekNumbers = new Set<number>();
    const deduplicatedWeeks = (weeks ?? []).filter((w: any) => {
      if (seenWeekNumbers.has(w.week_number)) return false;
      seenWeekNumbers.add(w.week_number);
      return true;
    });

    const [shiftsRes, employeesRes, notesRes, advancesRes, holidaysRes] =
      await Promise.all([
        weekIds.length > 0
          ? supabase.from("zt_shifts").select("*").in("week_id", weekIds)
          : { data: [], error: null },
        allRestaurantIds.length > 0
          ? supabase
              .from("staff_restaurants")
              .select(
                "zt_department, staff_id, restaurant_id, staff!inner(id, name, perso_nr, first_name, last_name, nickname)"
              )
              .in("restaurant_id", allRestaurantIds)
              .not("zt_department", "is", null)
          : { data: [], error: null },
        supabase
          .from("payroll_notes")
          .select("*")
          .in("period_id", allPeriodIds),
        supabase
          .from("advances")
          .select("*, sessions!inner(session_date, restaurant_id)")
          .in("sessions.restaurant_id", allRestaurantIds)
          .gte("sessions.session_date", period.start_date)
          .lte("sessions.session_date", period.end_date),
        supabase
          .from("bavarian_holidays")
          .select("holiday_date, name"),
      ]);

    // Deduplicate employees by id + department (keep first occurrence)
    const employeesRaw = (employeesRes.data as any[] ?? []).map((row: any) => ({
      id: row.staff.id,
      name: row.staff.name,
      perso_nr: row.staff.perso_nr,
      first_name: row.staff.first_name,
      last_name: row.staff.last_name,
      nickname: row.staff.nickname,
      department: row.zt_department,
      restaurant_id: row.restaurant_id,
    }));
    const seenEmps = new Set<string>();
    const employees = employeesRaw.filter((e: any) => {
      const key = `${e.id}-${e.department}`;
      if (seenEmps.has(key)) return false;
      seenEmps.add(key);
      return true;
    });

    const advances = (advancesRes.data as any[] ?? []).map((d: any) => ({
      staff_name: d.staff_name,
      amount: d.amount,
      date: d.sessions.session_date,
      restaurant_id: d.sessions.restaurant_id,
    }));

    return new Response(
      JSON.stringify({
        period: {
          id: period.id,
          label: period.label,
          start_date: period.start_date,
          end_date: period.end_date,
          status: period.status,
          restaurant_id: anchorRestaurantId,
        },
        weeks: deduplicatedWeeks,
        shifts: shiftsRes.data ?? [],
        employees,
        payrollNotes: notesRes.data ?? [],
        advances,
        holidays: holidaysRes.data ?? [],
        matchingPeriods,
        weekNumberToAllIds,
        weekToRestaurant,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
