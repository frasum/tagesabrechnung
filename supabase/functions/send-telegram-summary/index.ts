import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function formatEur(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error("Telegram secrets not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Determine date: use provided date or yesterday
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || getYesterday();
    } catch {
      targetDate = getYesterday();
    }

    // Load all restaurants
    const { data: restaurants, error: restError } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name");

    if (restError) throw restError;

    // Build message
    const lines: string[] = [`📊 *Tagesumsatz ${formatDateDE(targetDate)}*`];
    lines.push("");

    for (const restaurant of restaurants || []) {
      // Get session for this date and restaurant
      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_date", targetDate)
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (!session) {
        lines.push(`*${restaurant.name}:*`);
        lines.push("  Keine Daten");
        lines.push("");
        continue;
      }

      // Get waiter shifts for this session, sorted by pos_sales desc
      const { data: shifts } = await supabase
        .from("waiter_shifts")
        .select("waiter_name, second_waiter_name, pos_sales, submitted_at")
        .eq("session_id", session.id)
        .order("pos_sales", { ascending: false });

      const posTotal = session.pos_total || 0;

      lines.push(`*${restaurant.name}:*`);
      lines.push(`  Vectron: ${formatEur(posTotal)}`);
      const managerName = session.created_by_name || session.updated_by_name;
      if (managerName) {
        lines.push(`  Erstellt von: ${managerName}`);
      }

      if (shifts && shifts.length > 0) {
        lines.push("");
        lines.push("  Kellner:");
        for (const s of shifts) {
          const sales = s.pos_sales || 0;
          const time = s.submitted_at
            ? new Date(s.submitted_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })
            : "ausstehend";
          lines.push(`  • ${s.waiter_name}: ${formatEur(sales)} (Abgabe: ${time})`);
          if (s.second_waiter_name) {
            lines.push(`  • ${s.second_waiter_name}: ${formatEur(sales)} (Abgabe: ${time})`);
          }
        }
      }
      lines.push("");
    }

    const message = lines.join("\n");

    // Send via Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const telegramResult = await telegramRes.json();

    if (!telegramResult.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(telegramResult)}`);
    }

    return new Response(JSON.stringify({ success: true, date: targetDate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function formatDateDE(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}
