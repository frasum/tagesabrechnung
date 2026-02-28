import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "token required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get client IP for logging
    const clientIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Check if confirmation exists and is not expired
    const { data: confirmation, error: lookupError } = await supabaseAdmin
      .from("login_confirmations")
      .select("id, staff_id, expires_at, confirmed_at")
      .eq("token", token)
      .single();

    if (lookupError || !confirmation) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid token" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already confirmed
    if (confirmation.confirmed_at) {
      return new Response(
        JSON.stringify({ valid: false, error: "Already confirmed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if expired
    if (new Date(confirmation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "Token expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark as confirmed
    const { error: updateError } = await supabaseAdmin
      .from("login_confirmations")
      .update({
        confirmed_at: new Date().toISOString(),
        confirmed_ip: clientIp,
      })
      .eq("id", confirmation.id);

    if (updateError) {
      console.error("Error updating confirmation:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to confirm" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        staffId: confirmation.staff_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
