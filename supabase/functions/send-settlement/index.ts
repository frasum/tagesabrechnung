import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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

    // --- Deduplication check ---
    const { data: sessionCheck, error: checkError } = await supabase
      .from("sessions")
      .select("last_settlement_sent_at")
      .eq("id", session_id)
      .single();

    if (checkError) throw checkError;

    if (sessionCheck?.last_settlement_sent_at) {
      const lastSent = new Date(sessionCheck.last_settlement_sent_at).getTime();
      if (Date.now() - lastSent < DEDUP_WINDOW_MS) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "recently_sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const [sessionRes, waiterRes, kitchenRes, advancesRes] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", session_id).single(),
      supabase.from("waiter_shifts").select("*").eq("session_id", session_id),
      supabase.from("kitchen_shifts").select("*").eq("session_id", session_id),
      supabase.from("advances").select("*").eq("session_id", session_id),
    ]);

    // Fetch card transactions for each waiter shift
    const waiterShifts = waiterRes.data ?? [];
    const shiftIds = waiterShifts.map((s: { id: string }) => s.id);
    let cardTransactions: Record<string, unknown[]> = {};
    if (shiftIds.length > 0) {
      const { data: cards } = await supabase
        .from("card_transactions")
        .select("*")
        .in("waiter_shift_id", shiftIds);
      for (const card of cards ?? []) {
        if (!cardTransactions[card.waiter_shift_id]) {
          cardTransactions[card.waiter_shift_id] = [];
        }
        cardTransactions[card.waiter_shift_id].push(card);
      }
    }

    if (sessionRes.error) throw sessionRes.error;

    // Look up restaurant name
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", sessionRes.data.restaurant_id)
      .single();
    if (restError) throw restError;

    const secret = Deno.env.get("SETTLEMENT_WEBHOOK_SECRET");
    if (!secret) throw new Error("SETTLEMENT_WEBHOOK_SECRET not configured");

    const session = sessionRes.data;
    const total_revenue = (session.pos_total ?? 0) + (session.terminal_1_total ?? 0) + (session.terminal_2_total ?? 0);

    const payload = {
      secret,
      restaurant_name: restaurant.name,
      session_date: session.session_date,
      restaurant_id: session.restaurant_id,
      created_by_name: session.created_by_name,
      total_revenue,
      session,
      waiter_shifts: waiterShifts,
      kitchen_shifts: kitchenRes.data ?? [],
      advances: advancesRes.data ?? [],
      card_transactions: cardTransactions,
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

    // --- Mark as sent ---
    await supabase
      .from("sessions")
      .update({ last_settlement_sent_at: new Date().toISOString() })
      .eq("id", session_id);

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
