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

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [sessionRes, waiterRes, kitchenRes] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", session_id).single(),
      supabase.from("waiter_shifts").select("*").eq("session_id", session_id),
      supabase.from("kitchen_shifts").select("*").eq("session_id", session_id),
    ]);

    if (sessionRes.error) throw sessionRes.error;

    const secret = Deno.env.get("SETTLEMENT_WEBHOOK_SECRET");
    if (!secret) throw new Error("SETTLEMENT_WEBHOOK_SECRET not configured");

    const payload = {
      secret,
      restaurant_id: sessionRes.data.restaurant_id,
      session: sessionRes.data,
      waiter_shifts: waiterRes.data ?? [],
      kitchen_shifts: kitchenRes.data ?? [],
    };

    const webhookRes = await fetch(
      "https://uahvcjqufmnsmnnoydsa.supabase.co/functions/v1/receive-settlement",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const webhookBody = await webhookRes.text();

    if (!webhookRes.ok) {
      return new Response(
        JSON.stringify({ error: "Webhook failed", status: webhookRes.status, body: webhookBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, webhook_status: webhookRes.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
