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
    const body = await req.json();
    const { pin, action } = body;

    // ---- set_pin action (admin only) ----
    if (action === "set_pin") {
      const { new_pin, caller_staff_id } = body;

      if (!caller_staff_id || !new_pin) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate PIN format (4-6 digits)
      if (!/^\d{4,6}$/.test(new_pin)) {
        return new Response(JSON.stringify({ error: "PIN muss 4-6 Ziffern haben" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check admin permission
      const { data: permData } = await supabase.rpc("get_staff_permission", { p_staff_id: caller_staff_id });
      if (permData !== "admin") {
        return new Response(JSON.stringify({ error: "Keine Berechtigung" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert single row
      const { data: existing } = await supabase
        .from("payroll_office_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from("payroll_office_settings")
          .update({ pin_code: new_pin, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("payroll_office_settings")
          .insert({ pin_code: new_pin });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- get_pin action (admin only, returns current pin) ----
    if (action === "get_pin") {
      const { caller_staff_id } = body;
      if (!caller_staff_id) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: permData } = await supabase.rpc("get_staff_permission", { p_staff_id: caller_staff_id });
      if (permData !== "admin") {
        return new Response(JSON.stringify({ error: "Keine Berechtigung" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("payroll_office_settings")
        .select("pin_code")
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ pin: settings?.pin_code ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Default: validate PIN and return shared periods ----
    if (!pin) {
      return new Response(JSON.stringify({ error: "PIN fehlt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: check recent failed attempts
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("auth_attempts")
      .select("*", { count: "exact", head: true })
      .eq("identifier", "payroll_office")
      .eq("success", false)
      .gte("attempted_at", fifteenMinAgo);

    if ((recentAttempts ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Zu viele Versuche. Bitte warten." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate PIN
    const { data: settings } = await supabase
      .from("payroll_office_settings")
      .select("pin_code")
      .limit(1)
      .maybeSingle();

    if (!settings || settings.pin_code !== pin) {
      // Log failed attempt
      await supabase.from("auth_attempts").insert({
        identifier: "payroll_office",
        success: false,
        ip_address: req.headers.get("x-forwarded-for") ?? null,
      });

      return new Response(JSON.stringify({ error: "Falscher PIN" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful attempt
    await supabase.from("auth_attempts").insert({
      identifier: "payroll_office",
      success: true,
      ip_address: req.headers.get("x-forwarded-for") ?? null,
    });

    // Return all shared periods across all restaurants
    const { data: periods, error: periodsError } = await supabase
      .from("scheduling_periods")
      .select("id, label, start_date, end_date, status, share_token, shared_at, restaurant_id, restaurants!inner(name)")
      .not("share_token", "is", null)
      .order("start_date", { ascending: false });

    if (periodsError) throw periodsError;

    const result = (periods ?? []).map((p: any) => ({
      id: p.id,
      label: p.label,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      restaurant_name: p.restaurants?.name ?? "Unbekannt",
    }));

    return new Response(JSON.stringify({ periods: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
