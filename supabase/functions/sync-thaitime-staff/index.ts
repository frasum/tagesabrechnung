import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-staff-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check: require admin permission via x-staff-id
    const staffId = req.headers.get("x-staff-id");
    if (!staffId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check admin permission
    const { data: permLevel } = await supabase.rpc("get_staff_permission", {
      p_staff_id: staffId,
    });
    if (permLevel !== "admin") {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch employees from thaitime
    const syncApiKey = Deno.env.get("THAITIME_SYNC_API_KEY");
    if (!syncApiKey) {
      return new Response(
        JSON.stringify({ error: "THAITIME_SYNC_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const thaitimeUrl =
      "https://dqxyyfxcwuxtzyhxlfyo.supabase.co/functions/v1/sync-employees";
    const ttResponse = await fetch(thaitimeUrl, {
      headers: { "x-sync-key": syncApiKey },
    });

    if (!ttResponse.ok) {
      const errText = await ttResponse.text();
      return new Response(
        JSON.stringify({ error: "thaitime API error", details: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const employees = await ttResponse.json();
    if (!Array.isArray(employees)) {
      return new Response(
        JSON.stringify({ error: "Unexpected response format" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all existing staff
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("id, name, perso_nr");

    const staffByPersoNr = new Map<number, { id: string; name: string }>();
    const staffByName = new Map<string, { id: string; perso_nr: number | null }>();
    for (const s of existingStaff || []) {
      if (s.perso_nr) staffByPersoNr.set(s.perso_nr, { id: s.id, name: s.name });
      staffByName.set(s.name.toLowerCase(), { id: s.id, perso_nr: s.perso_nr });
    }

    let updated = 0;
    let created = 0;
    let skipped = 0;

    for (const emp of employees) {
      const persoNr = emp.perso_nr;
      const displayName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();

      if (!displayName) {
        skipped++;
        continue;
      }

      // Build update payload with all available fields
      const payload: Record<string, unknown> = {
        first_name: emp.first_name || null,
        last_name: emp.last_name || null,
        hourly_rate: emp.hourly_rate ?? null,
        is_active: emp.is_active ?? true,
      };

      // Payroll fields (only set if provided by thaitime)
      if (emp.tax_class !== undefined) payload.tax_class = emp.tax_class;
      if (emp.is_minijob !== undefined) payload.is_minijob = emp.is_minijob;
      if (emp.is_sv_exempt !== undefined) payload.is_sv_exempt = emp.is_sv_exempt;
      if (emp.date_of_birth !== undefined) payload.date_of_birth = emp.date_of_birth;
      if (emp.employment_start_date !== undefined) payload.employment_start = emp.employment_start_date;
      if (emp.employment_end_date !== undefined) payload.employment_end = emp.employment_end_date;
      if (emp.tax_id !== undefined) payload.tax_id = emp.tax_id;
      if (emp.social_security_number !== undefined) payload.social_security_nr = emp.social_security_number;
      if (emp.nationality !== undefined) payload.nationality = emp.nationality;
      if (emp.personnel_group !== undefined) payload.personnel_group = emp.personnel_group;
      if (emp.health_insurance !== undefined) payload.health_insurance = emp.health_insurance;
      if (emp.vacation_days_contractual !== undefined) payload.vacation_days_contractual = emp.vacation_days_contractual;
      if (emp.vacation_days_previous_year !== undefined) payload.vacation_days_previous = emp.vacation_days_previous_year;
      if (emp.vacation_days_current_year !== undefined) payload.vacation_days_current = emp.vacation_days_current_year;
      if (emp.vacation_days_taken !== undefined) payload.vacation_days_taken = emp.vacation_days_taken;
      if (emp.sick_days_total !== undefined) payload.sick_days_total = emp.sick_days_total;

      // Match by perso_nr first, then by name
      let matchedId: string | null = null;
      if (persoNr && staffByPersoNr.has(persoNr)) {
        matchedId = staffByPersoNr.get(persoNr)!.id;
      } else if (displayName && staffByName.has(displayName.toLowerCase())) {
        matchedId = staffByName.get(displayName.toLowerCase())!.id;
      }

      if (matchedId) {
        // Update existing
        payload.name = displayName;
        if (persoNr) payload.perso_nr = persoNr;
        const { error } = await supabase
          .from("staff")
          .update(payload)
          .eq("id", matchedId);
        if (error) {
          console.error(`Failed to update ${displayName}:`, error);
          skipped++;
        } else {
          updated++;
        }
      } else {
        // Create new
        const { error } = await supabase.from("staff").insert({
          name: displayName,
          perso_nr: persoNr || null,
          role: "waiter",
          ...payload,
        });
        if (error) {
          console.error(`Failed to create ${displayName}:`, error);
          skipped++;
        } else {
          created++;
        }
      }
    }

    return new Response(
      JSON.stringify({ updated, created, skipped, total: employees.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("sync-thaitime-staff error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
