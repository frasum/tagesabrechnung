import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Zeiterfassung project (read-only, anon key)
const ZT_URL = "https://uahvcjqufmnsmnnoydsa.supabase.co";
const ZT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhaHZjanF1Zm1uc21ubm95ZHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjUyMDcsImV4cCI6MjA4NzYwMTIwN30.ktKTQewjL3BXAgh7d-_pYphgjOSTIz-9EADTolv1Ncg";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Read from Zeiterfassung DB
    const zt = createClient(ZT_URL, ZT_ANON_KEY);

    const [employeesRes, mappingsRes] = await Promise.all([
      zt.from("employees").select("id, first_name, last_name, nickname, perso_nr"),
      zt.from("staff_mapping").select("employee_id, tagesabrechnung_name"),
    ]);

    if (employeesRes.error) throw new Error(`ZT employees: ${employeesRes.error.message}`);
    if (mappingsRes.error) throw new Error(`ZT staff_mapping: ${mappingsRes.error.message}`);

    const employees = new Map(employeesRes.data.map((e: any) => [e.id, e]));
    const mappings = mappingsRes.data as { employee_id: string; tagesabrechnung_name: string }[];

    // 2) Write to local DB using service role key
    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const local = createClient(localUrl, serviceKey);

    let updated = 0;
    let notFound = 0;
    const notFoundNames: string[] = [];
    const updatedNames: string[] = [];

    for (const mapping of mappings) {
      const emp = employees.get(mapping.employee_id);
      if (!emp) continue;

      const { data: staffRows, error: staffErr } = await local
        .from("staff")
        .select("id")
        .ilike("name", mapping.tagesabrechnung_name)
        .limit(1);

      if (staffErr) {
        console.error(`Error finding staff "${mapping.tagesabrechnung_name}":`, staffErr.message);
        continue;
      }

      if (!staffRows || staffRows.length === 0) {
        notFound++;
        notFoundNames.push(mapping.tagesabrechnung_name);
        continue;
      }

      const { error: updateErr } = await local
        .from("staff")
        .update({
          first_name: emp.first_name || null,
          last_name: emp.last_name || null,
          nickname: emp.nickname || null,
          perso_nr: emp.perso_nr || null,
        })
        .eq("id", staffRows[0].id);

      if (updateErr) {
        console.error(`Error updating staff "${mapping.tagesabrechnung_name}":`, updateErr.message);
      } else {
        updated++;
        updatedNames.push(mapping.tagesabrechnung_name);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        notFound,
        updatedNames,
        notFoundNames,
        totalMappings: mappings.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-staff-from-zt error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
