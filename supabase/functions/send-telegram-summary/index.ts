import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatEur(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

interface TelegramSettings {
  bot_token: string;
  chat_id: string;
  excluded_restaurants: string[];
  show_pos_total: boolean;
  show_guest_count: boolean;
  show_cash_balance: boolean;
  show_cash_details: boolean;
  show_created_by: boolean;
  show_waiters: boolean;
  show_kitchen: boolean;
  show_notes: boolean;
}

interface DayCashDetails {
  kreditkarten: number;
  ordersmart: number;
  wolt: number;
  gutscheineEL: number;
  finedine: number;
  gutscheineVK: number;
  einladung: number;
  offeneRE: number;
  vorschuss: number;
  ausgaben: number;
  sonstigeEinnahme: number;
  bargeld: number;
}

async function loadSettings(supabase: any): Promise<TelegramSettings> {
  const { data } = await supabase
    .from("telegram_settings")
    .select("excluded_restaurants, show_pos_total, show_guest_count, show_cash_balance, show_cash_details, show_created_by, show_waiters, show_kitchen, show_notes")
    .limit(1)
    .maybeSingle();

  // Credentials ONLY from environment variables (never from DB)
  const bot_token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const chat_id = Deno.env.get("TELEGRAM_CHAT_ID") || "";

  return {
    bot_token,
    chat_id,
    excluded_restaurants: data?.excluded_restaurants || [],
    show_pos_total: data?.show_pos_total ?? true,
    show_guest_count: data?.show_guest_count ?? true,
    show_cash_balance: data?.show_cash_balance ?? true,
    show_cash_details: data?.show_cash_details ?? true,
    show_created_by: data?.show_created_by ?? true,
    show_waiters: data?.show_waiters ?? true,
    show_kitchen: data?.show_kitchen ?? true,
    show_notes: data?.show_notes ?? true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const settings = await loadSettings(supabase);

    if (!settings.bot_token || !settings.chat_id) {
      throw new Error("Telegram secrets not configured");
    }

    // Determine date
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || getYesterday();
    } catch {
      targetDate = getYesterday();
    }

    // Load restaurants (excluding filtered ones)
    const { data: restaurants, error: restError } = await supabase
      .from("restaurants")
      .select("id, name")
      .order("name");

    if (restError) throw restError;

    const filteredRestaurants = (restaurants || []).filter(
      (r: any) => !settings.excluded_restaurants.includes(r.id)
    );

    // Build message
    const lines: string[] = [`📊 *Tagesumsatz ${formatDateDE(targetDate)}*`, ""];

    for (const restaurant of filteredRestaurants) {
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

      const posTotal = session.pos_total || 0;
      lines.push(`*${restaurant.name}:*`);

      if (settings.show_pos_total) {
        lines.push(`  Vectron: ${formatEur(posTotal)}`);
      }
      if (settings.show_guest_count && session.guest_count && session.guest_count > 0) {
        const avgSpend = (posTotal - (session.takeaway_total || 0)) / session.guest_count;
        lines.push(`  Gäste: ${session.guest_count} (⌀ ${formatEur(avgSpend)})`);
      }
      if (settings.show_cash_balance || settings.show_cash_details) {
        const cashResult = await calculateCashBalance(supabase, restaurant.id, targetDate);
        if (cashResult !== null) {
          if (settings.show_cash_balance) {
            lines.push(`  Wechselgeldbestand: ${formatEur(cashResult.kassenbestand)}`);
          }
          if (settings.show_cash_details && cashResult.details) {
            const d = cashResult.details;
            lines.push("");
            lines.push("  Bargeld-Details:");
            if (d.kreditkarten) lines.push(`  Kreditkarten: -${formatEur(d.kreditkarten)}`);
            if (d.ordersmart) lines.push(`  OrderSmart: -${formatEur(d.ordersmart)}`);
            if (d.wolt) lines.push(`  Wolt: -${formatEur(d.wolt)}`);
            if (d.gutscheineEL) lines.push(`  Gutsch. EL: -${formatEur(d.gutscheineEL)}`);
            if (d.finedine) lines.push(`  FineDine: -${formatEur(d.finedine)}`);
            if (d.gutscheineVK) lines.push(`  Gutsch. VK: +${formatEur(d.gutscheineVK)}`);
            if (d.sonstigeEinnahme) lines.push(`  Sonst. Einnahme: +${formatEur(d.sonstigeEinnahme)}`);
            if (d.einladung) lines.push(`  Einladung: -${formatEur(d.einladung)}`);
            if (d.offeneRE) lines.push(`  Offene RE: -${formatEur(d.offeneRE)}`);
            if (d.vorschuss) lines.push(`  Vorschuss: -${formatEur(d.vorschuss)}`);
            if (d.ausgaben) lines.push(`  Ausgaben: -${formatEur(d.ausgaben)}`);
            lines.push(`  ➜ Bargeld: ${formatEur(d.bargeld)}`);
          }
        }
      }
      if (settings.show_created_by) {
        const managerName = session.created_by_name || session.updated_by_name;
        if (managerName) {
          lines.push(`  Erstellt von: ${managerName}`);
        }
      }

      if (settings.show_waiters) {
        const { data: shifts } = await supabase
          .from("waiter_shifts")
          .select("waiter_name, second_waiter_name, additional_waiters, pos_sales, submitted_at")
          .eq("session_id", session.id)
          .order("pos_sales", { ascending: false });

        if (shifts && shifts.length > 0) {
          lines.push("");
          lines.push("  Kellner:");
          for (const s of shifts) {
            const sales = s.pos_sales || 0;
            const time = s.submitted_at
              ? new Date(s.submitted_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })
              : "ausstehend";
            const additionalWaiters: string[] = (s as any).additional_waiters || [];
            const teamSize = 1 + additionalWaiters.length;
            const salesPerPerson = teamSize > 1 ? sales / teamSize : sales;
            lines.push(`  • ${s.waiter_name}: ${formatEur(salesPerPerson)} (Abgabe: ${time})`);
            for (const name of additionalWaiters) {
              lines.push(`  • ${name}: ${formatEur(salesPerPerson)} (Abgabe: ${time})`);
            }
          }
        }
      }

      if (settings.show_kitchen) {
        const { data: kitchenShifts } = await supabase
          .from("kitchen_shifts")
          .select("staff_name, shift_start, shift_end, hours_worked")
          .eq("session_id", session.id)
          .order("staff_name");

        if (kitchenShifts && kitchenShifts.length > 0) {
          lines.push("");
          lines.push("  Küche:");
          for (const k of kitchenShifts) {
            const hours = k.hours_worked ? `${k.hours_worked}h` : "";
            lines.push(`  • ${k.staff_name} (${k.shift_start.slice(0, 5)}-${k.shift_end.slice(0, 5)}${hours ? ", " + hours : ""})`);
          }
        }
      }

      if (settings.show_notes && session.notes && session.notes.trim()) {
        lines.push(`  📝 Notizen: ${session.notes.trim()}`);
      }

      lines.push("");
    }

    const message = lines.join("\n");

    // Send via Telegram
    const telegramUrl = `https://api.telegram.org/bot${settings.bot_token}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.chat_id,
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

async function calculateCashBalance(supabase: any, restaurantId: string, upToDate: string): Promise<{ kassenbestand: number; details: DayCashDetails | null } | null> {
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, session_date, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, vouchers_redeemed, finedine_vouchers, vouchers_sold, einladung, vorschuss, sonstige_einnahme")
    .eq("restaurant_id", restaurantId)
    .lte("session_date", upToDate)
    .order("session_date", { ascending: true });

  if (sessionsError || !sessions || sessions.length === 0) return null;

  const sessionIds = sessions.map((s: any) => s.id);

  const [shiftsRes, expensesRes, advancesRes, settingsRes, restaurantRes, transfersRes] = await Promise.all([
    supabase.from("waiter_shifts").select("session_id, open_invoices").in("session_id", sessionIds),
    supabase.from("expenses").select("session_id, amount").in("session_id", sessionIds),
    supabase.from("advances").select("session_id, amount").in("session_id", sessionIds),
    supabase.from("settings").select("value").eq("restaurant_id", restaurantId).eq("key", "petty_cash").maybeSingle(),
    supabase.from("restaurants").select("initial_cash_deficit").eq("id", restaurantId).single(),
    supabase.from("register_transfers").select("transfer_date, direction, amount").eq("restaurant_id", restaurantId).lte("transfer_date", upToDate),
  ]);

  const waiterShifts = shiftsRes.data || [];
  const expenses = expensesRes.data || [];
  const advances = advancesRes.data || [];
  const transfers = transfersRes.data || [];
  const pettyCashRaw = settingsRes.data?.value;
  const pettyCash = pettyCashRaw
    ? (typeof pettyCashRaw === "object" && pettyCashRaw.amount != null ? Number(pettyCashRaw.amount) : Number(pettyCashRaw))
    : 0;
  const initialDeficit = restaurantRes.data?.initial_cash_deficit ?? 0;

  // Build session map by date
  const sessionMap = new Map<string, any>();
  for (const s of sessions) sessionMap.set(s.session_date, s);

  // Find transfer-only dates (no session)
  const transferOnlyDates = new Set<string>();
  for (const t of transfers) {
    if (!sessionMap.has(t.transfer_date)) transferOnlyDates.add(t.transfer_date);
  }

  // All dates sorted
  const allDates = [...new Set([
    ...sessions.map((s: any) => s.session_date),
    ...transferOnlyDates,
  ])].sort();

  let carryOver = initialDeficit;
  const dailyBargeld: number[] = [];
  let targetDetails: DayCashDetails | null = null;

  for (const date of allDates) {
    const session = sessionMap.get(date);

    const tagesumsatz = session?.pos_total || 0;
    const kreditkarten = (session?.terminal_1_total || 0) + (session?.terminal_2_total || 0);
    const ordersmart = session?.ordersmart_revenue || 0;
    const wolt = session?.wolt_revenue || 0;
    const gutscheineEL = session?.vouchers_redeemed || 0;
    const finedine = session?.finedine_vouchers || 0;
    const gutscheineVK = session?.vouchers_sold || 0;
    const einladung = session?.einladung || 0;
    const sonstigeEinnahme = session?.sonstige_einnahme || 0;

    const sessionShifts = session ? waiterShifts.filter((s: any) => s.session_id === session.id) : [];
    const sessionExpenses = session ? expenses.filter((e: any) => e.session_id === session.id) : [];
    const sessionAdvances = session ? advances.filter((a: any) => a.session_id === session.id) : [];

    const totalOpenInvoices = sessionShifts.reduce((sum: number, w: any) => sum + (w.open_invoices || 0), 0);
    const totalExpenses = sessionExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const vorschuss = sessionAdvances.length > 0
      ? sessionAdvances.reduce((sum: number, a: any) => sum + a.amount, 0)
      : (session?.vorschuss || 0);

    const dayTransfers = transfers.filter((t: any) => t.transfer_date === date);
    const transferEffect = dayTransfers.reduce((sum: number, t: any) => {
      return t.direction === 'to_restaurant' ? sum + Number(t.amount) : sum - Number(t.amount);
    }, 0);

    const rawBargeld = tagesumsatz + gutscheineVK + sonstigeEinnahme
      - kreditkarten - ordersmart - wolt - gutscheineEL - finedine - einladung
      - totalOpenInvoices - vorschuss - totalExpenses
      + transferEffect;

    const bargeld = rawBargeld + carryOver;
    carryOver = bargeld < 0 ? bargeld : 0;
    dailyBargeld.push(rawBargeld);

    if (date === upToDate) {
      targetDetails = {
        kreditkarten,
        ordersmart,
        wolt,
        gutscheineEL,
        finedine,
        gutscheineVK,
        einladung,
        offeneRE: totalOpenInvoices,
        vorschuss,
        ausgaben: totalExpenses,
        sonstigeEinnahme,
        bargeld,
      };
    }
  }

  let kassenbestand = pettyCash;
  for (const bargeld of dailyBargeld) {
    kassenbestand += bargeld;
    if (kassenbestand > pettyCash) {
      kassenbestand = pettyCash;
    }
  }

  return { kassenbestand, details: targetDetails };
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
