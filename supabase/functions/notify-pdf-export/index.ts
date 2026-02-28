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

  try {
    const bot_token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chat_id = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!bot_token || !chat_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Telegram not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { date, restaurant_name, exported_by } = await req.json();

    if (!date) {
      return new Response(
        JSON.stringify({ success: false, error: "date required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format date to German
    const [y, m, d] = date.split("-");
    const dateDE = `${d}.${m}.${y}`;

    const lines = [
      `📄 *PDF Export*`,
      ``,
      `Tagesabrechnung für *${dateDE}*`,
    ];
    if (restaurant_name) lines.push(`Restaurant: ${restaurant_name}`);
    if (exported_by) lines.push(`Exportiert von: ${exported_by}`);

    const now = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
    lines.push(`Zeitpunkt: ${now}`);

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${bot_token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id,
          text: lines.join("\n"),
          parse_mode: "Markdown",
        }),
      }
    );

    const result = await telegramRes.json();

    if (!result.ok) {
      console.error("Telegram error:", result);
      return new Response(
        JSON.stringify({ success: false, error: "Telegram send failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
