import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: batch .in() queries in chunks of 500
async function batchIn<T>(
  supabase: any,
  table: string,
  selectCols: string,
  filterCol: string,
  ids: string[],
  batchSize = 500
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { data } = await supabase
      .from(table)
      .select(selectCols)
      .in(filterCol, batch);
    if (data) results.push(...data);
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, restaurant_ids, caller_staff_id } = await req.json();

    if (!caller_staff_id || !restaurant_ids?.length || !messages?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify admin permission
    const { data: permData, error: permError } = await supabase.rpc(
      "get_staff_permission",
      { p_staff_id: caller_staff_id }
    );
    if (permError || permData !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate date ranges
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);
    const since90Str = since90.toISOString().split("T")[0];

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const since30Str = since30.toISOString().split("T")[0];

    // Load sessions (90 days) + staff + restaurants in parallel
    const [sessionsRes, staffRes, restaurantsRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, session_date, restaurant_id, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, guest_count, vouchers_sold, vouchers_redeemed, finedine_vouchers, einladung, sonstige_einnahme, notes, created_by_name")
        .in("restaurant_id", restaurant_ids)
        .gte("session_date", since90Str)
        .order("session_date", { ascending: false })
        .limit(5000),
      supabase
        .from("staff")
        .select("name, role, is_active, participates_in_pool")
        .limit(5000),
      supabase
        .from("restaurants")
        .select("id, name, slug")
        .in("id", restaurant_ids),
    ]);

    const sessions = sessionsRes.data || [];
    const sessionIds = sessions.map((s: any) => s.id);

    // Load related data using batched .in() queries
    let waiterShifts: any[] = [];
    let kitchenShifts: any[] = [];
    let expenses: any[] = [];
    let advances: any[] = [];

    if (sessionIds.length > 0) {
      [waiterShifts, kitchenShifts, expenses, advances] = await Promise.all([
        batchIn(supabase, "waiter_shifts",
          "session_id, waiter_name, pos_sales, kassiert_brutto, differenz, kitchen_tip, hours_worked, participates_in_pool, additional_waiters",
          "session_id", sessionIds),
        batchIn(supabase, "kitchen_shifts",
          "session_id, staff_name, hours_worked",
          "session_id", sessionIds),
        batchIn(supabase, "expenses",
          "session_id, amount, description",
          "session_id", sessionIds),
        batchIn(supabase, "advances",
          "session_id, amount, staff_name",
          "session_id", sessionIds),
      ]);
    }

    // Build restaurant name map
    const restaurantMap: Record<string, string> = {};
    (restaurantsRes.data || []).forEach((r: any) => {
      restaurantMap[r.id] = r.name;
    });

    // Build monthly aggregation
    const monthlyAgg: Record<string, Record<string, number>> = {};
    sessions.forEach((s: any) => {
      const month = s.session_date.slice(0, 7);
      const restaurant = restaurantMap[s.restaurant_id] || "?";
      const key = `${month}|${restaurant}`;
      if (!monthlyAgg[key]) {
        monthlyAgg[key] = { pos_total: 0, kreditkarten: 0, ordersmart: 0, wolt: 0, gutscheine_vk: 0, gutscheine_einl: 0, finedine: 0, einladung: 0, sonstige_einnahme: 0, gaeste: 0, sessions_count: 0 };
      }
      const a = monthlyAgg[key];
      a.pos_total += s.pos_total || 0;
      a.kreditkarten += (s.terminal_1_total || 0) + (s.terminal_2_total || 0);
      a.ordersmart += s.ordersmart_revenue || 0;
      a.wolt += s.wolt_revenue || 0;
      a.gutscheine_vk += s.vouchers_sold || 0;
      a.gutscheine_einl += s.vouchers_redeemed || 0;
      a.finedine += s.finedine_vouchers || 0;
      a.einladung += s.einladung || 0;
      a.sonstige_einnahme += s.sonstige_einnahme || 0;
      a.gaeste += s.guest_count || 0;
      a.sessions_count += 1;
    });

    // Aggregate expenses and advances per month
    const expBySession: Record<string, number> = {};
    expenses.forEach((e: any) => { expBySession[e.session_id] = (expBySession[e.session_id] || 0) + (e.amount || 0); });
    const advBySession: Record<string, number> = {};
    advances.forEach((a: any) => { advBySession[a.session_id] = (advBySession[a.session_id] || 0) + (a.amount || 0); });

    const monthlyExpAdv: Record<string, { ausgaben: number; vorschuesse: number }> = {};
    sessions.forEach((s: any) => {
      const month = s.session_date.slice(0, 7);
      const restaurant = restaurantMap[s.restaurant_id] || "?";
      const key = `${month}|${restaurant}`;
      if (!monthlyExpAdv[key]) monthlyExpAdv[key] = { ausgaben: 0, vorschuesse: 0 };
      monthlyExpAdv[key].ausgaben += expBySession[s.id] || 0;
      monthlyExpAdv[key].vorschuesse += advBySession[s.id] || 0;
    });

    // Aggregate waiter tips per month per waiter per restaurant
    const sessionMonthRestaurant: Record<string, { month: string; restaurant: string }> = {};
    sessions.forEach((s: any) => {
      sessionMonthRestaurant[s.id] = { month: s.session_date.slice(0, 7), restaurant: restaurantMap[s.restaurant_id] || "?" };
    });

    const waiterTipAgg: Record<string, Record<string, number>> = {};
    const waiterHoursAgg: Record<string, Record<string, number>> = {};
    const kitchenHoursAgg: Record<string, Record<string, number>> = {};
    const kitchenTipAgg: Record<string, number> = {};

    // Group waiter shifts by session for pool calculation
    const shiftsBySession: Record<string, any[]> = {};
    waiterShifts.forEach((ws: any) => {
      if (!shiftsBySession[ws.session_id]) shiftsBySession[ws.session_id] = [];
      shiftsBySession[ws.session_id].push(ws);
    });

    // Pool-based tip distribution (matching app logic)
    for (const [sessionId, shiftsInSession] of Object.entries(shiftsBySession)) {
      const info = sessionMonthRestaurant[sessionId];
      if (!info) continue;
      const key = `${info.month}|${info.restaurant}`;
      if (!waiterTipAgg[key]) waiterTipAgg[key] = {};
      if (!waiterHoursAgg[key]) waiterHoursAgg[key] = {};

      // Session pool = sum of all differenz
      const sessionPool = shiftsInSession.reduce((sum: number, s: any) => sum + (s.differenz || 0), 0);

      // Count participating waiter shares (additional_waiters count extra)
      const waiterShareCount = shiftsInSession.reduce((count: number, s: any) => {
        if (!s.participates_in_pool) return count;
        const additionalCount = (s.additional_waiters?.length || 0);
        return count + 1 + additionalCount;
      }, 0);

      // Distribute pool equally among participants (FIX: also distribute negative pools)
      if (waiterShareCount > 0 && sessionPool !== 0) {
        const tipPerWaiter = sessionPool / waiterShareCount;
        shiftsInSession.forEach((ws: any) => {
          // Track hours for all
          waiterHoursAgg[key][ws.waiter_name] = (waiterHoursAgg[key][ws.waiter_name] || 0) + (ws.hours_worked || 0);

          if (!ws.participates_in_pool) return;

          // Primary waiter gets pool share
          waiterTipAgg[key][ws.waiter_name] = (waiterTipAgg[key][ws.waiter_name] || 0) + tipPerWaiter;

          // Additional waiters get pool share too
          const additionalWaiters: string[] = ws.additional_waiters || [];
          for (const name of additionalWaiters) {
            waiterTipAgg[key][name] = (waiterTipAgg[key][name] || 0) + tipPerWaiter;
          }
        });
      } else {
        // Track hours even if no pool
        shiftsInSession.forEach((ws: any) => {
          waiterHoursAgg[key][ws.waiter_name] = (waiterHoursAgg[key][ws.waiter_name] || 0) + (ws.hours_worked || 0);
        });
      }

      // Kitchen tip aggregate
      kitchenTipAgg[key] = (kitchenTipAgg[key] || 0) + shiftsInSession.reduce((sum: number, ws: any) => sum + (ws.kitchen_tip || 0), 0);
    }

    kitchenShifts.forEach((ks: any) => {
      const info = sessionMonthRestaurant[ks.session_id];
      if (!info) return;
      const key = `${info.month}|${info.restaurant}`;
      if (!kitchenHoursAgg[key]) kitchenHoursAgg[key] = {};
      kitchenHoursAgg[key][ks.staff_name] = (kitchenHoursAgg[key][ks.staff_name] || 0) + (ks.hours_worked || 0);
    });

    // Build context string
    const contextParts: string[] = [];

    contextParts.push("=== RESTAURANTS ===");
    (restaurantsRes.data || []).forEach((r: any) => {
      contextParts.push(`${r.name} (${r.slug})`);
    });

    // Monthly summary BEFORE raw data
    contextParts.push("\n=== MONATLICHE ZUSAMMENFASSUNG (voraggregiert, korrekte Summen) ===");
    contextParts.push("Monat | Restaurant | Tage | Umsatz | Kreditkarten | OrderSmart | Wolt | Gutschein-VK | Gutschein-Einl | FineDine | Einladung | SoEinnahme | Gäste | Ausgaben | Vorschüsse | Küchen-TG-Gesamt");
    const sortedKeys = Object.keys(monthlyAgg).sort();
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const a = monthlyAgg[key];
      const ea = monthlyExpAdv[key] || { ausgaben: 0, vorschuesse: 0 };
      const kt = kitchenTipAgg[key] || 0;
      contextParts.push(
        `${month} | ${restaurant} | ${a.sessions_count} | ${a.pos_total}€ | ${a.kreditkarten}€ | ${a.ordersmart}€ | ${a.wolt}€ | ${a.gutscheine_vk}€ | ${a.gutscheine_einl}€ | ${a.finedine}€ | ${a.einladung}€ | ${a.sonstige_einnahme}€ | ${a.gaeste} | ${ea.ausgaben}€ | ${ea.vorschuesse}€ | ${kt}€`
      );
    }

    // Waiter tip ranking per month per restaurant
    contextParts.push("\n=== MONATLICHES KELLNER-TRINKGELD RANKING (voraggregiert) ===");
    contextParts.push("Monat | Restaurant | Kellner | Trinkgeld (Pool-Anteil) | Stunden");
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const tips = waiterTipAgg[key] || {};
      const hours = waiterHoursAgg[key] || {};
      const sorted = Object.entries(tips).sort((a, b) => b[1] - a[1]);
      for (const [name, tip] of sorted) {
        contextParts.push(`${month} | ${restaurant} | ${name} | ${tip}€ | ${hours[name] || 0}h`);
      }
    }

    // Kitchen hours per month per restaurant
    contextParts.push("\n=== MONATLICHE KÜCHEN-STUNDEN (voraggregiert) ===");
    contextParts.push("Monat | Restaurant | Mitarbeiter | Stunden");
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const hours = kitchenHoursAgg[key] || {};
      const sorted = Object.entries(hours).sort((a, b) => b[1] - a[1]);
      for (const [name, h] of sorted) {
        contextParts.push(`${month} | ${restaurant} | ${name} | ${h}h`);
      }
    }

    // Build session info map with date + restaurant
    const sessionInfoMap: Record<string, { date: string; restaurant: string }> = {};
    sessions.forEach((s: any) => {
      sessionInfoMap[s.id] = { date: s.session_date, restaurant: restaurantMap[s.restaurant_id] || "?" };
    });

    // RAW DATA: limited to last 30 days for context optimization
    const recentSessions = sessions.filter((s: any) => s.session_date >= since30Str);
    const recentSessionIds = new Set(recentSessions.map((s: any) => s.id));

    contextParts.push("\n=== SESSIONS (letzte 30 Tage, Rohdaten) ===");
    contextParts.push("Datum | Restaurant | Kassen-Umsatz | Kreditkarten | OrderSmart | Wolt | Gutschein-VK | Gutschein-Einl | FineDine-Gutscheine | Einladung | SoEinnahme | Gäste | Notizen");
    recentSessions.forEach((s: any) => {
      const cards = (s.terminal_1_total || 0) + (s.terminal_2_total || 0);
      contextParts.push(
        `${s.session_date} | ${restaurantMap[s.restaurant_id] || "?"} | ${s.pos_total || 0}€ | ${cards}€ | ${s.ordersmart_revenue || 0}€ | ${s.wolt_revenue || 0}€ | ${s.vouchers_sold || 0}€ | ${s.vouchers_redeemed || 0}€ | ${s.finedine_vouchers || 0}€ | ${s.einladung || 0}€ | ${s.sonstige_einnahme || 0}€ | ${s.guest_count || 0} | ${s.notes || "-"}`
      );
    });

    contextParts.push("\n=== KELLNER-SCHICHTEN (letzte 30 Tage) ===");
    contextParts.push("Session-Datum | Restaurant | Name | POS-Umsatz | Kassiert | Kellner-TG (Pool-Anteil) | Küchen-TG | Stunden");
    waiterShifts.filter((ws: any) => recentSessionIds.has(ws.session_id)).forEach((ws: any) => {
      const info = sessionInfoMap[ws.session_id] || { date: "?", restaurant: "?" };
      contextParts.push(
        `${info.date} | ${info.restaurant} | ${ws.waiter_name} | ${ws.pos_sales || 0}€ | ${ws.kassiert_brutto || 0}€ | ${ws.differenz || 0}€ | ${ws.kitchen_tip || 0}€ | ${ws.hours_worked || "-"}h`
      );
    });

    contextParts.push("\n=== KÜCHEN-SCHICHTEN (letzte 30 Tage) ===");
    contextParts.push("Session-Datum | Restaurant | Name | Stunden");
    kitchenShifts.filter((ks: any) => recentSessionIds.has(ks.session_id)).forEach((ks: any) => {
      const info = sessionInfoMap[ks.session_id] || { date: "?", restaurant: "?" };
      contextParts.push(
        `${info.date} | ${info.restaurant} | ${ks.staff_name} | ${ks.hours_worked || 0}h`
      );
    });

    contextParts.push("\n=== AUSGABEN (letzte 30 Tage) ===");
    contextParts.push("Session-Datum | Restaurant | Betrag | Beschreibung");
    expenses.filter((e: any) => recentSessionIds.has(e.session_id)).forEach((e: any) => {
      const info = sessionInfoMap[e.session_id] || { date: "?", restaurant: "?" };
      contextParts.push(
        `${info.date} | ${info.restaurant} | ${e.amount}€ | ${e.description}`
      );
    });

    contextParts.push("\n=== VORSCHÜSSE (letzte 30 Tage) ===");
    contextParts.push("Session-Datum | Restaurant | Name | Betrag");
    advances.filter((a: any) => recentSessionIds.has(a.session_id)).forEach((a: any) => {
      const info = sessionInfoMap[a.session_id] || { date: "?", restaurant: "?" };
      contextParts.push(
        `${info.date} | ${info.restaurant} | ${a.staff_name} | ${a.amount}€`
      );
    });

    contextParts.push("\n=== MITARBEITER ===");
    contextParts.push("Name | Rolle | Aktiv | Pool");
    (staffRes.data || []).forEach((s: any) => {
      contextParts.push(
        `${s.name} | ${s.role} | ${s.is_active ? "ja" : "nein"} | ${s.participates_in_pool ? "ja" : "nein"}`
      );
    });

    const dataContext = contextParts.join("\n");

    const systemPrompt = `Du bist ein hilfreicher Assistent für ein Restaurant-Kassensystem. Du antwortest auf Deutsch.
Du hast Zugriff auf die folgenden echten Daten der letzten 90 Tage:

${dataContext}

Wichtige Regeln:
- Die MONATLICHE ZUSAMMENFASSUNG, das KELLNER-TRINKGELD RANKING und die KÜCHEN-STUNDEN enthalten voraggregierte, korrekte Summen. Verwende IMMER diese Summen wenn nach Monats-Totalen, Rankings oder Stunden-Summen gefragt wird, anstatt selbst aus den Rohdaten zu rechnen.
- Formatiere Geldbeträge immer als Euro (z.B. 1.234,56 €)
- Nutze Markdown-Tabellen wenn es sinnvoll ist
- Antworte präzise und basierend auf den Daten
- Wenn Daten nicht vorhanden sind, sage das klar
- Wenn mehrere Restaurants vorhanden sind, gliedere deine Antwort immer nach Restaurant
- "Kellner-TG (Pool-Anteil)" ist das Trinkgeld das der Kellner behält (sein Anteil am Trinkgeld-Pool). "Küchen-TG" ist der separate Anteil der an die Küche abgeführt wird. Wenn nach "Trinkgeld" eines Kellners gefragt wird, verwende den "Kellner-TG (Pool-Anteil)".
- Die Rohdaten (Sessions, Schichten, Ausgaben, Vorschüsse) sind nur für die letzten 30 Tage verfügbar. Für ältere Zeiträume nutze die voraggregierten Monatssummen.
- Alle Fragen beziehen sich ausschließlich auf dieses Restaurant-Kassensystem ("Tagesabrechnung") und die darin verfügbaren Daten. Wenn jemand eine Frage stellt, die nichts mit dem System, den Restaurants oder den Betriebsdaten zu tun hat, weise freundlich darauf hin, dass du nur Fragen zu diesem System beantworten kannst.
- Du kennst die Funktionen des Systems: Tagesabrechnung (Kassenschluss), Kellner-Abrechnung, Küchentrinkgeld-Aufteilung, Kassenstand, Ausgaben & Vorschüsse, Mitarbeiterverwaltung, Statistiken, Zeiterfassung mit Schichtplanung und Provisionsberechnung.
- Heute ist ${new Date().toISOString().split("T")[0]}`;

    // Call OpenAI API
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errText);
      const errorMsg = aiResponse.status === 429
        ? `Rate limit / Kontingent: ${errText}`
        : `OpenAI Fehler (${aiResponse.status}): ${errText}`;
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("restaurant-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
