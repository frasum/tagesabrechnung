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

        // Check period is not locked
        if (period.status === "locked") {
          return new Response(JSON.stringify({ error: "Periode ist gesperrt" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify week belongs to this period
        const { data: week } = await supabase
          .from("weeks")
          .select("id")
          .eq("id", week_id)
          .eq("period_id", period.id)
          .maybeSingle();

        if (!week) {
          return new Response(JSON.stringify({ error: "Woche gehört nicht zu dieser Periode" }), {
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
      const { employee_id, field, value } = body;

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

      const { data: existingNote } = await supabase
        .from("payroll_notes")
        .select("id")
        .eq("employee_id", employee_id)
        .eq("period_id", period.id)
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
          period_id: period.id,
          [field]: value,
        });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: return all data
    const restaurantId = period.restaurant_id;

    const { data: weeks } = await supabase
      .from("weeks")
      .select("*")
      .eq("period_id", period.id)
      .order("week_number");

    const weekIds = (weeks ?? []).map((w: any) => w.id);

    const [shiftsRes, employeesRes, notesRes, advancesRes, holidaysRes] =
      await Promise.all([
        weekIds.length > 0
          ? supabase.from("zt_shifts").select("*").in("week_id", weekIds)
          : { data: [], error: null },
        supabase
          .from("staff_restaurants")
          .select(
            "zt_department, staff_id, staff!inner(id, name, perso_nr, first_name, last_name, nickname)"
          )
          .eq("restaurant_id", restaurantId)
          .not("zt_department", "is", null),
        supabase
          .from("payroll_notes")
          .select("*")
          .eq("period_id", period.id),
        supabase
          .from("advances")
          .select("*, sessions!inner(session_date)")
          .eq("sessions.restaurant_id", restaurantId)
          .gte("sessions.session_date", period.start_date)
          .lte("sessions.session_date", period.end_date),
        supabase
          .from("bavarian_holidays")
          .select("holiday_date, name"),
      ]);

    const employees = (employeesRes.data as any[] ?? []).map((row: any) => ({
      id: row.staff.id,
      name: row.staff.name,
      perso_nr: row.staff.perso_nr,
      first_name: row.staff.first_name,
      last_name: row.staff.last_name,
      nickname: row.staff.nickname,
      department: row.zt_department,
    }));

    const advances = (advancesRes.data as any[] ?? []).map((d: any) => ({
      staff_name: d.staff_name,
      amount: d.amount,
      date: d.sessions.session_date,
    }));

    return new Response(
      JSON.stringify({
        period: {
          id: period.id,
          label: period.label,
          start_date: period.start_date,
          end_date: period.end_date,
          status: period.status,
        },
        weeks: weeks ?? [],
        shifts: shiftsRes.data ?? [],
        employees,
        payrollNotes: notesRes.data ?? [],
        advances,
        holidays: holidaysRes.data ?? [],
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
