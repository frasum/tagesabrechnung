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

    // Calculate 90 days ago
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().split("T")[0];

    // Load data in parallel
    const [sessionsRes, staffRes, restaurantsRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, session_date, restaurant_id, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, guest_count, vouchers_sold, vouchers_redeemed, finedine_vouchers, einladung, sonstige_einnahme, notes, created_by_name")
        .in("restaurant_id", restaurant_ids)
        .gte("session_date", sinceStr)
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

    // Load related data
    let waiterShifts: any[] = [];
    let kitchenShifts: any[] = [];
    let expenses: any[] = [];
    let advances: any[] = [];

    if (sessionIds.length > 0) {
      const [wsRes, ksRes, expRes, advRes] = await Promise.all([
        supabase
          .from("waiter_shifts")
          .select("session_id, waiter_name, pos_sales, kassiert_brutto, differenz, kitchen_tip, hours_worked")
          .in("session_id", sessionIds)
          .limit(5000),
        supabase
          .from("kitchen_shifts")
          .select("session_id, staff_name, hours_worked")
          .in("session_id", sessionIds)
          .limit(5000),
        supabase
          .from("expenses")
          .select("session_id, amount, description")
          .in("session_id", sessionIds)
          .limit(5000),
        supabase
          .from("advances")
          .select("session_id, amount, staff_name")
          .in("session_id", sessionIds)
          .limit(5000),
      ]);
      waiterShifts = wsRes.data || [];
      kitchenShifts = ksRes.data || [];
      expenses = expRes.data || [];
      advances = advRes.data || [];
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

    // Build context string
    const contextParts: string[] = [];

    contextParts.push("=== RESTAURANTS ===");
    (restaurantsRes.data || []).forEach((r: any) => {
      contextParts.push(`${r.name} (${r.slug})`);
    });

    // Monthly summary BEFORE raw data
    contextParts.push("\n=== MONATLICHE ZUSAMMENFASSUNG (voraggregiert, korrekte Summen) ===");
    contextParts.push("Monat | Restaurant | Tage | Umsatz | Kreditkarten | OrderSmart | Wolt | Gutschein-VK | Gutschein-Einl | FineDine | Einladung | SoEinnahme | Gäste | Ausgaben | Vorschüsse");
    const sortedKeys = Object.keys(monthlyAgg).sort();
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const a = monthlyAgg[key];
      const ea = monthlyExpAdv[key] || { ausgaben: 0, vorschuesse: 0 };
      contextParts.push(
        `${month} | ${restaurant} | ${a.sessions_count} | ${a.pos_total}€ | ${a.kreditkarten}€ | ${a.ordersmart}€ | ${a.wolt}€ | ${a.gutscheine_vk}€ | ${a.gutscheine_einl}€ | ${a.finedine}€ | ${a.einladung}€ | ${a.sonstige_einnahme}€ | ${a.gaeste} | ${ea.ausgaben}€ | ${ea.vorschuesse}€`
      );
    }

    contextParts.push("\n=== SESSIONS (letzte 90 Tage, Rohdaten) ===");
    contextParts.push("Datum | Restaurant | Kassen-Umsatz | Kreditkarten | OrderSmart | Wolt | Gutschein-VK | Gutschein-Einl | FineDine-Gutscheine | Einladung | SoEinnahme | Gäste | Notizen");
    sessions.forEach((s: any) => {
      const cards = (s.terminal_1_total || 0) + (s.terminal_2_total || 0);
      contextParts.push(
        `${s.session_date} | ${restaurantMap[s.restaurant_id] || "?"} | ${s.pos_total || 0}€ | ${cards}€ | ${s.ordersmart_revenue || 0}€ | ${s.wolt_revenue || 0}€ | ${s.vouchers_sold || 0}€ | ${s.vouchers_redeemed || 0}€ | ${s.finedine_vouchers || 0}€ | ${s.einladung || 0}€ | ${s.sonstige_einnahme || 0}€ | ${s.guest_count || 0} | ${s.notes || "-"}`
      );
    });

    // Build session info map with date + restaurant
    const sessionInfoMap: Record<string, { date: string; restaurant: string }> = {};
    sessions.forEach((s: any) => {
      sessionInfoMap[s.id] = { date: s.session_date, restaurant: restaurantMap[s.restaurant_id] || "?" };
    });

    contextParts.push("\n=== KELLNER-SCHICHTEN ===");
    contextParts.push("Session-Datum | Restaurant | Name | POS-Umsatz | Kassiert | Kellner-TG (Pool-Anteil) | Küchen-TG | Stunden");
    waiterShifts.forEach((ws: any) => {
      const info = sessionInfoMap[ws.session_id] || { date: "?", restaurant: "?" };
      contextParts.push(
        `${info.date} | ${info.restaurant} | ${ws.waiter_name} | ${ws.pos_sales || 0}€ | ${ws.kassiert_brutto || 0}€ | ${ws.differenz || 0}€ | ${ws.kitchen_tip || 0}€ | ${ws.hours_worked || "-"}h`
      );
    });

    contextParts.push("\n=== KÜCHEN-SCHICHTEN ===");
    contextParts.push("Session-Datum | Restaurant | Name | Stunden");
    kitchenShifts.forEach((ks: any) => {
      const info = sessionInfoMap[ks.session_id] || { date: "?", restaurant: "?" };
      contextParts.push(
        `${info.date} | ${info.restaurant} | ${ks.staff_name} | ${ks.hours_worked || 0}h`
      );
    });

    contextParts.push("\n=== AUSGABEN ===");
    contextParts.push("Session-Datum | Restaurant | Betrag | Beschreibung");
    expenses.forEach((e: any) => {
      const info = sessionInfoMap[e.session_id] || { date: "?", restaurant: "?" };
      contextParts.push(
        `${info.date} | ${info.restaurant} | ${e.amount}€ | ${e.description}`
      );
    });

    contextParts.push("\n=== VORSCHÜSSE ===");
    contextParts.push("Session-Datum | Restaurant | Name | Betrag");
    advances.forEach((a: any) => {
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
- Die MONATLICHE ZUSAMMENFASSUNG enthält voraggregierte, korrekte Summen. Verwende IMMER diese Summen wenn nach Monats-Totalen gefragt wird, anstatt selbst aus den Rohdaten zu rechnen.
- Formatiere Geldbeträge immer als Euro (z.B. 1.234,56 €)
- Nutze Markdown-Tabellen wenn es sinnvoll ist
- Antworte präzise und basierend auf den Daten
- Wenn Daten nicht vorhanden sind, sage das klar
- Wenn mehrere Restaurants vorhanden sind, gliedere deine Antwort immer nach Restaurant
- "Kellner-TG (Pool-Anteil)" ist das Trinkgeld das der Kellner behält (sein Anteil am Trinkgeld-Pool). "Küchen-TG" ist der separate Anteil der an die Küche abgeführt wird. Wenn nach "Trinkgeld" eines Kellners gefragt wird, verwende den "Kellner-TG (Pool-Anteil)".
- Heute ist ${new Date().toISOString().split("T")[0]}`;

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Kontingent aufgebraucht. Bitte Credits aufladen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI-Fehler" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
