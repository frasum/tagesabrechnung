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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let staff_id: string | null = null;

    // Strategy 1: OAuth JWT
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("staff_id")
          .eq("user_id", user.id)
          .single();
        staff_id = profile?.staff_id ?? null;
      }
    }

    // Strategy 2: PIN-based fallback via x-staff-id header
    if (!staff_id) {
      const headerStaffId = req.headers.get("x-staff-id");
      if (headerStaffId) {
        const permLevel = await supabaseAdmin.rpc("get_staff_permission", { p_staff_id: headerStaffId });
        if (permLevel.data && permLevel.data !== "staff") {
          staff_id = headerStaffId;
        }
      }
    }

    if (!staff_id) {
      return new Response(
        JSON.stringify({ error: "Not authorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("login_confirmations")
      .insert({ staff_id })
      .select("token, expires_at")
      .single();

    if (error || !data) {
      console.error("Error creating login confirmation:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create confirmation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        token: data.token,
        expiresAt: data.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
