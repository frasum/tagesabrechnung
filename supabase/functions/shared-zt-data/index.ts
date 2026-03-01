import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // POST: update payroll_notes
    if (req.method === "POST") {
      const body = await req.json();
      const { employee_id, field, value } = body;

      if (!employee_id || !field) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only allow specific fields
      if (!["vorschuss", "besonderheiten", "urlaub_tage"].includes(field)) {
        return new Response(JSON.stringify({ error: "Ungültiges Feld" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if note exists
      const { data: existing } = await supabase
        .from("payroll_notes")
        .select("id")
        .eq("employee_id", employee_id)
        .eq("period_id", period.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("payroll_notes")
          .update({ [field]: value })
          .eq("id", existing.id);
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

    // Get weeks
    const { data: weeks } = await supabase
      .from("weeks")
      .select("*")
      .eq("period_id", period.id)
      .order("week_number");

    const weekIds = (weeks ?? []).map((w: any) => w.id);

    // Get shifts, employees, payroll_notes, advances in parallel
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
