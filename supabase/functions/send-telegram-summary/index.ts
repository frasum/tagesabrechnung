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

      // Get kitchen shifts for this session
      const { data: kitchenShifts } = await supabase
        .from("kitchen_shifts")
        .select("staff_name, shift_start, shift_end, hours_worked")
        .eq("session_id", session.id)
        .order("staff_name");

      // Calculate cumulative cash balance
      const cashBalance = await calculateCashBalance(supabase, restaurant.id, targetDate);

      const posTotal = session.pos_total || 0;

      lines.push(`*${restaurant.name}:*`);
      lines.push(`  Vectron: ${formatEur(posTotal)}`);
      if (session.guest_count && session.guest_count > 0) {
        const avgSpend = posTotal / session.guest_count;
        lines.push(`  Gäste: ${session.guest_count} (⌀ ${formatEur(avgSpend)})`);
      }
      if (cashBalance !== null) {
        lines.push(`  Kassenbestand: ${formatEur(cashBalance)}`);
      }
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

      if (kitchenShifts && kitchenShifts.length > 0) {
        lines.push("");
        lines.push("  Küche:");
        for (const k of kitchenShifts) {
          const hours = k.hours_worked ? `${k.hours_worked}h` : "";
          lines.push(`  • ${k.staff_name} (${k.shift_start.slice(0, 5)}-${k.shift_end.slice(0, 5)}${hours ? ", " + hours : ""})`);
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

async function calculateCashBalance(supabase: any, restaurantId: string, upToDate: string): Promise<number | null> {
  // Load all sessions up to targetDate
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, session_date, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, vouchers_redeemed, finedine_vouchers, vouchers_sold, einladung, vorschuss")
    .eq("restaurant_id", restaurantId)
    .lte("session_date", upToDate)
    .order("session_date", { ascending: true });

  if (sessionsError || !sessions || sessions.length === 0) return null;

  const sessionIds = sessions.map((s: any) => s.id);

  // Load waiter_shifts, expenses, advances in parallel
  const [shiftsRes, expensesRes, advancesRes, settingsRes] = await Promise.all([
    supabase.from("waiter_shifts").select("session_id, open_invoices").in("session_id", sessionIds),
    supabase.from("expenses").select("session_id, amount").in("session_id", sessionIds),
    supabase.from("advances").select("session_id, amount").in("session_id", sessionIds),
    supabase.from("settings").select("value").eq("restaurant_id", restaurantId).eq("key", "petty_cash").maybeSingle(),
  ]);

  const waiterShifts = shiftsRes.data || [];
  const expenses = expensesRes.data || [];
  const advances = advancesRes.data || [];
  const pettyCash = settingsRes.data?.value ? Number(settingsRes.data.value) : 0;

  let totalCash = 0;

  for (const session of sessions) {
    const tagesumsatz = session.pos_total || 0;
    const kreditkarten = (session.terminal_1_total || 0) + (session.terminal_2_total || 0);
    const ordersmart = session.ordersmart_revenue || 0;
    const wolt = session.wolt_revenue || 0;
    const gutscheineEL = session.vouchers_redeemed || 0;
    const finedine = session.finedine_vouchers || 0;
    const gutscheineVK = session.vouchers_sold || 0;
    const einladung = session.einladung || 0;

    const sessionShifts = waiterShifts.filter((s: any) => s.session_id === session.id);
    const sessionExpenses = expenses.filter((e: any) => e.session_id === session.id);
    const sessionAdvances = advances.filter((a: any) => a.session_id === session.id);

    const totalOpenInvoices = sessionShifts.reduce((sum: number, w: any) => sum + (w.open_invoices || 0), 0);
    const totalExpenses = sessionExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const vorschuss = sessionAdvances.length > 0
      ? sessionAdvances.reduce((sum: number, a: any) => sum + a.amount, 0)
      : (session.vorschuss || 0);

    const bargeld = tagesumsatz + gutscheineVK - kreditkarten - ordersmart - wolt - gutscheineEL - finedine - einladung - totalOpenInvoices - vorschuss - totalExpenses;
    totalCash += bargeld;
  }

  return totalCash + pettyCash;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function formatDateDE(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}
