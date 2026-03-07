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

const GL_ROLES = new Set(["gl", "kitchen_gl"]);

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

    // Calculate date range for raw data (30 days)

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const since30Str = since30.toISOString().split("T")[0];

    // Weather code to label mapping
    const weatherCodeLabel = (code: number): string => {
      if (code === 0) return "Sonnig";
      if (code <= 3) return "Bewölkt";
      if (code <= 48) return "Nebel";
      if (code <= 57) return "Nieselregen";
      if (code <= 65) return "Regen";
      if (code <= 67) return "Gefrierender Regen";
      if (code <= 77) return "Schnee";
      if (code <= 82) return "Regenschauer";
      if (code <= 86) return "Schneeschauer";
      if (code <= 99) return "Gewitter";
      return "?";
    };

    // Load ALL sessions + staff + restaurants + settings + staff_restaurants + weather in parallel
    const weatherPromise = fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.14&longitude=11.58&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe/Berlin&past_days=90&forecast_days=3"
    ).then(r => r.json()).catch(() => null);

    const [sessionsRes, staffRes, restaurantsRes, settingsRes, staffRestaurantsRes, weatherData] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, session_date, restaurant_id, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, guest_count, vouchers_sold, vouchers_redeemed, finedine_vouchers, einladung, sonstige_einnahme, notes, created_by_name")
        .in("restaurant_id", restaurant_ids)
        .order("session_date", { ascending: false })
        .limit(10000),
      supabase
        .from("staff")
        .select("id, name, nickname, role, is_active, participates_in_pool, perso_nr, is_minijob, employment_start, employment_end, vacation_days_contractual, vacation_days_previous, vacation_days_current, vacation_days_taken, sick_days_total")
        .limit(5000),
      supabase
        .from("restaurants")
        .select("id, name, slug")
        .in("id", restaurant_ids),
      supabase
        .from("settings")
        .select("key, value, restaurant_id")
        .in("restaurant_id", restaurant_ids)
        .in("key", ["commission_min_revenue", "commission_pct"]),
      supabase
        .from("staff_restaurants")
        .select("staff_id, restaurant_id, zt_department")
        .in("restaurant_id", restaurant_ids),
      weatherPromise,
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
          "session_id, waiter_name, staff_id, second_waiter_name, additional_waiters, pos_sales, kassiert_brutto, differenz, kitchen_tip, hours_worked, participates_in_pool",
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

    // Load ALL zt_shifts (90 days) for comprehensive workforce data
    const allStaffIds = (staffRes.data || []).map((s: any) => s.id);
    let ztShifts: any[] = [];
    if (allStaffIds.length > 0) {
      ztShifts = await batchIn(supabase, "zt_shifts",
        "employee_id, shift_date, total_hours, evening_hours, night_hours, night_deep_hours, sunday_holiday_hours, is_holiday, department, absence_type",
        "employee_id", allStaffIds);
      // No date filter — load all zt_shifts for full historical aggregations
    }

    // Separate service staff IDs for commission calculation
    const serviceStaffIds = (staffRestaurantsRes.data || [])
      .filter((sr: any) => sr.zt_department === "Service")
      .map((sr: any) => sr.staff_id);

    // Build restaurant name map
    const restaurantMap: Record<string, string> = {};
    (restaurantsRes.data || []).forEach((r: any) => {
      restaurantMap[r.id] = r.name;
    });

    // Build staff lookup maps
    const allStaff = staffRes.data || [];
    const staffById: Record<string, any> = {};
    const staffNameToId = new Map<string, string>();
    const glStaffIds = new Set<string>();
    allStaff.forEach((s: any) => {
      staffById[s.id] = s;
      staffNameToId.set(s.name.toLowerCase(), s.id);
      if (s.nickname) staffNameToId.set(s.nickname.toLowerCase(), s.id);
      if (GL_ROLES.has(s.role)) glStaffIds.add(s.id);
    });

    const isGlByName = (name: string): boolean => {
      const id = staffNameToId.get(name.toLowerCase());
      return id ? glStaffIds.has(id) : false;
    };

    // Build commission settings per restaurant
    const commissionSettings: Record<string, { minRevenue: number; pct: number }> = {};
    restaurant_ids.forEach((rid: string) => {
      commissionSettings[rid] = { minRevenue: 1200, pct: 5 };
    });
    (settingsRes.data || []).forEach((s: any) => {
      if (!commissionSettings[s.restaurant_id]) return;
      if (s.key === "commission_min_revenue") {
        commissionSettings[s.restaurant_id].minRevenue = (s.value as any)?.amount ?? 1200;
      } else if (s.key === "commission_pct") {
        commissionSettings[s.restaurant_id].pct = (s.value as any)?.pct ?? 5;
      }
    });

    // Build service staff set per restaurant
    const serviceStaffByRestaurant: Record<string, Set<string>> = {};
    (staffRestaurantsRes.data || []).forEach((sr: any) => {
      if (!serviceStaffByRestaurant[sr.restaurant_id]) serviceStaffByRestaurant[sr.restaurant_id] = new Set();
      serviceStaffByRestaurant[sr.restaurant_id].add(sr.staff_id);
    });

    // Build zt_shifts lookup: employee_id:date → hours
    const ztHoursByStaffDate = new Map<string, number>();
    const ztHoursByStaffMonth: Record<string, Record<string, number>> = {}; // month|restaurant → staffId → hours
    ztShifts.forEach((z: any) => {
      const key = `${z.employee_id}:${z.shift_date}`;
      ztHoursByStaffDate.set(key, (ztHoursByStaffDate.get(key) ?? 0) + (Number(z.total_hours) || 0));
    });

    // Build session → restaurant mapping
    const sessionRestaurant: Record<string, string> = {};
    sessions.forEach((s: any) => { sessionRestaurant[s.id] = s.restaurant_id; });

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
    const sessionMonthRestaurant: Record<string, { month: string; restaurant: string; restaurantId: string; date: string }> = {};
    sessions.forEach((s: any) => {
      sessionMonthRestaurant[s.id] = { month: s.session_date.slice(0, 7), restaurant: restaurantMap[s.restaurant_id] || "?", restaurantId: s.restaurant_id, date: s.session_date };
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

      // Distribute pool equally among participants
      if (waiterShareCount > 0 && sessionPool !== 0) {
        const tipPerWaiter = sessionPool / waiterShareCount;
        shiftsInSession.forEach((ws: any) => {
          waiterHoursAgg[key][ws.waiter_name] = (waiterHoursAgg[key][ws.waiter_name] || 0) + (ws.hours_worked || 0);
          if (!ws.participates_in_pool) return;
          waiterTipAgg[key][ws.waiter_name] = (waiterTipAgg[key][ws.waiter_name] || 0) + tipPerWaiter;
          const additionalWaiters: string[] = ws.additional_waiters || [];
          for (const name of additionalWaiters) {
            waiterTipAgg[key][name] = (waiterTipAgg[key][name] || 0) + tipPerWaiter;
          }
        });
      } else {
        shiftsInSession.forEach((ws: any) => {
          waiterHoursAgg[key][ws.waiter_name] = (waiterHoursAgg[key][ws.waiter_name] || 0) + (ws.hours_worked || 0);
        });
      }

      kitchenTipAgg[key] = (kitchenTipAgg[key] || 0) + shiftsInSession.reduce((sum: number, ws: any) => sum + (ws.kitchen_tip || 0), 0);
    }

    kitchenShifts.forEach((ks: any) => {
      const info = sessionMonthRestaurant[ks.session_id];
      if (!info) return;
      const key = `${info.month}|${info.restaurant}`;
      if (!kitchenHoursAgg[key]) kitchenHoursAgg[key] = {};
      kitchenHoursAgg[key][ks.staff_name] = (kitchenHoursAgg[key][ks.staff_name] || 0) + (ks.hours_worked || 0);
    });

    // ==========================================
    // COMMISSION CALCULATION (per month per restaurant)
    // ==========================================
    // Group waiter shifts by month|restaurantId|date for day-by-day commission calc
    const commissionByMonthRestaurant: Record<string, {
      restaurantId: string;
      minRevenue: number;
      pct: number;
      qualDays: number;
      totalDays: number;
      pool: number;
      staffHours: Record<string, number>; // staffName → hours
    }> = {};

    // Group waiter shifts by restaurantId+date
    const shiftsByRestDate: Record<string, any[]> = {};
    waiterShifts.forEach((ws: any) => {
      const info = sessionMonthRestaurant[ws.session_id];
      if (!info) return;
      const key = `${info.restaurantId}:${info.date}`;
      if (!shiftsByRestDate[key]) shiftsByRestDate[key] = [];
      shiftsByRestDate[key].push(ws);
    });

    // Process each restaurant+date
    const daysByMonthRest: Record<string, { dates: Set<string>; qualDays: number; pool: number }> = {};

    for (const [rdKey, shifts] of Object.entries(shiftsByRestDate)) {
      const [restaurantId, date] = rdKey.split(":");
      const month = date.slice(0, 7);
      const restaurant = restaurantMap[restaurantId] || "?";
      const mrKey = `${month}|${restaurant}`;
      const settings = commissionSettings[restaurantId] || { minRevenue: 1200, pct: 5 };

      if (!daysByMonthRest[mrKey]) {
        daysByMonthRest[mrKey] = { dates: new Set(), qualDays: 0, pool: 0 };
        commissionByMonthRestaurant[mrKey] = {
          restaurantId,
          minRevenue: settings.minRevenue,
          pct: settings.pct,
          qualDays: 0,
          totalDays: 0,
          pool: 0,
          staffHours: {},
        };
      }

      const dayData = daysByMonthRest[mrKey];
      dayData.dates.add(date);

      // Filter out GL staff, count unique service staff including secondary/additional
      const staffSet = new Set<string>();
      let dayRevenue = 0;

      for (const ws of shifts) {
        // Skip GL
        if (ws.staff_id && glStaffIds.has(ws.staff_id)) continue;

        const key = ws.staff_id || ws.waiter_name;
        staffSet.add(key);
        dayRevenue += Number(ws.pos_sales) || 0;

        // Count secondary waiters
        if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
          const sid = staffNameToId.get(ws.second_waiter_name.toLowerCase());
          staffSet.add(sid || `secondary:${ws.second_waiter_name}`);
        }
        if (ws.additional_waiters?.length) {
          for (const aw of ws.additional_waiters) {
            if (aw && !isGlByName(aw)) {
              const awSid = staffNameToId.get(aw.toLowerCase());
              staffSet.add(awSid || `secondary:${aw}`);
            }
          }
        }
      }

      const staffCount = staffSet.size;
      if (staffCount > 0) {
        const dayAvg = dayRevenue / staffCount;
        if (dayAvg >= settings.minRevenue) {
          const excess = dayRevenue - (settings.minRevenue * staffCount);
          const dayPool = Math.max(0, excess * (settings.pct / 100));
          dayData.qualDays++;
          dayData.pool += dayPool;
        }
      }
    }

    // Build zt_shifts hours per month|restaurant per staff for commission distribution
    // Map ALL staff to restaurants
    const staffToRestaurants: Record<string, string[]> = {};
    (staffRestaurantsRes.data || []).forEach((sr: any) => {
      if (!staffToRestaurants[sr.staff_id]) staffToRestaurants[sr.staff_id] = [];
      if (!staffToRestaurants[sr.staff_id].includes(sr.restaurant_id)) {
        staffToRestaurants[sr.staff_id].push(sr.restaurant_id);
      }
    });

    // Map staff to departments per restaurant
    const staffDeptByRest: Record<string, string> = {}; // staffId:restaurantId → department
    (staffRestaurantsRes.data || []).forEach((sr: any) => {
      staffDeptByRest[`${sr.staff_id}:${sr.restaurant_id}`] = sr.zt_department || "?";
    });

    // Aggregate zt hours by month|restaurant|staffName (for commission: only Service)
    const ztHoursMonthRest: Record<string, Record<string, number>> = {};
    const serviceStaffIdSet = new Set(serviceStaffIds);
    ztShifts.forEach((z: any) => {
      if (!serviceStaffIdSet.has(z.employee_id)) return;
      const month = z.shift_date.slice(0, 7);
      const rids = staffToRestaurants[z.employee_id] || [];
      const staffName = staffById[z.employee_id]?.name || "?";
      for (const rid of rids) {
        const restaurant = restaurantMap[rid] || "?";
        const mrKey = `${month}|${restaurant}`;
        if (!ztHoursMonthRest[mrKey]) ztHoursMonthRest[mrKey] = {};
        ztHoursMonthRest[mrKey][staffName] = (ztHoursMonthRest[mrKey][staffName] || 0) + (Number(z.total_hours) || 0);
      }
    });

    // Finalize commission data
    for (const [mrKey, dayData] of Object.entries(daysByMonthRest)) {
      const comm = commissionByMonthRestaurant[mrKey];
      if (!comm) continue;
      comm.totalDays = dayData.dates.size;
      comm.qualDays = dayData.qualDays;
      comm.pool = dayData.pool;
      comm.staffHours = ztHoursMonthRest[mrKey] || {};
    }

    // ==========================================
    // COMPREHENSIVE WORKFORCE DATA (per month per restaurant per employee)
    // ==========================================
    type WorkforceEntry = { total: number; evening: number; night: number; nightDeep: number; sundayHoliday: number; absences: Record<string, number>; dept: string };
    const workforceAgg: Record<string, Record<string, WorkforceEntry>> = {}; // month|restaurant → staffName → data

    ztShifts.forEach((z: any) => {
      const month = z.shift_date.slice(0, 7);
      const rids = staffToRestaurants[z.employee_id] || [];
      const staffName = staffById[z.employee_id]?.name || "?";

      for (const rid of rids) {
        const restaurant = restaurantMap[rid] || "?";
        const mrKey = `${month}|${restaurant}`;
        if (!workforceAgg[mrKey]) workforceAgg[mrKey] = {};
        if (!workforceAgg[mrKey][staffName]) {
          const dept = staffDeptByRest[`${z.employee_id}:${rid}`] || z.department || "?";
          workforceAgg[mrKey][staffName] = { total: 0, evening: 0, night: 0, nightDeep: 0, sundayHoliday: 0, absences: {}, dept };
        }
        const entry = workforceAgg[mrKey][staffName];

        if (z.absence_type) {
          entry.absences[z.absence_type] = (entry.absences[z.absence_type] || 0) + 1;
        } else {
          entry.total += Number(z.total_hours) || 0;
          entry.evening += Number(z.evening_hours) || 0;
          entry.night += Number(z.night_hours) || 0;
          entry.nightDeep += Number(z.night_deep_hours) || 0;
          entry.sundayHoliday += Number(z.sunday_holiday_hours) || 0;
        }
      }
    });

    // ==========================================
    // WAITER PERFORMANCE AGGREGATION (pos_sales + shifts per waiter per month)
    // ==========================================
    const waiterPerfAgg: Record<string, Record<string, { revenue: number; shifts: number; hours: number }>> = {};
    waiterShifts.forEach((ws: any) => {
      const info = sessionMonthRestaurant[ws.session_id];
      if (!info) return;
      const key = `${info.month}|${info.restaurant}`;
      if (!waiterPerfAgg[key]) waiterPerfAgg[key] = {};
      if (!waiterPerfAgg[key][ws.waiter_name]) waiterPerfAgg[key][ws.waiter_name] = { revenue: 0, shifts: 0, hours: 0 };
      waiterPerfAgg[key][ws.waiter_name].revenue += Number(ws.pos_sales) || 0;
      waiterPerfAgg[key][ws.waiter_name].shifts += 1;
      waiterPerfAgg[key][ws.waiter_name].hours += Number(ws.hours_worked) || 0;
    });

    // ==========================================
    // ANOMALY DETECTION (last 7 days vs previous 7 days)
    // ==========================================
    const today = new Date();
    const since7 = new Date(today); since7.setDate(since7.getDate() - 7);
    const since14 = new Date(today); since14.setDate(since14.getDate() - 14);
    const since7Str = since7.toISOString().split("T")[0];
    const since14Str = since14.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const anomalies: string[] = [];

    // Per-restaurant anomaly detection
    for (const rid of restaurant_ids) {
      const rName = restaurantMap[rid] || "?";
      const last7Sessions = sessions.filter((s: any) => s.restaurant_id === rid && s.session_date >= since7Str && s.session_date <= todayStr);
      const prev7Sessions = sessions.filter((s: any) => s.restaurant_id === rid && s.session_date >= since14Str && s.session_date < since7Str);

      // 1. Revenue comparison
      const last7Revenue = last7Sessions.reduce((s: number, ss: any) => s + (ss.pos_total || 0), 0);
      const prev7Revenue = prev7Sessions.reduce((s: number, ss: any) => s + (ss.pos_total || 0), 0);
      if (prev7Revenue > 0) {
        const revChange = ((last7Revenue - prev7Revenue) / prev7Revenue) * 100;
        if (Math.abs(revChange) >= 15) {
          const dir = revChange > 0 ? "über" : "unter";
          anomalies.push(`⚠ Umsatz letzte 7 Tage (${rName}): ${last7Revenue.toFixed(0)}€ — ${Math.abs(revChange).toFixed(0)}% ${dir} Vorwoche (${prev7Revenue.toFixed(0)}€)`);
        }
      }

      // 2. Guest count trend
      const last7Guests = last7Sessions.reduce((s: number, ss: any) => s + (ss.guest_count || 0), 0);
      const prev7Guests = prev7Sessions.reduce((s: number, ss: any) => s + (ss.guest_count || 0), 0);
      if (prev7Guests > 0) {
        const guestChange = ((last7Guests - prev7Guests) / prev7Guests) * 100;
        if (Math.abs(guestChange) >= 10) {
          const dir = guestChange > 0 ? "+" : "";
          anomalies.push(`ℹ Gästezahl ${rName}: ${dir}${guestChange.toFixed(0)}% gegenüber Vorwoche (${last7Guests} vs. ${prev7Guests})`);
        }
      }

      // 3. Missing days (last 7 days without sessions)
      const last7Dates = new Set(last7Sessions.map((s: any) => s.session_date));
      const missingDays: string[] = [];
      for (let d = new Date(since7); d <= today; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().split("T")[0];
        if (!last7Dates.has(ds) && ds <= todayStr) missingDays.push(ds);
      }
      if (missingDays.length > 0 && missingDays.length <= 3) {
        anomalies.push(`ℹ Fehlende Abrechnungen (${rName}): ${missingDays.join(", ")}`);
      }
    }

    // 4. Waiter performance deviations (last 7 days)
    const last7SessionIds = new Set(sessions.filter((s: any) => s.session_date >= since7Str && s.session_date <= todayStr).map((s: any) => s.id));
    const waiterPerf7: Record<string, { revenue: number; hours: number }> = {};
    waiterShifts.forEach((ws: any) => {
      if (!last7SessionIds.has(ws.session_id)) return;
      if (!waiterPerf7[ws.waiter_name]) waiterPerf7[ws.waiter_name] = { revenue: 0, hours: 0 };
      waiterPerf7[ws.waiter_name].revenue += Number(ws.pos_sales) || 0;
      waiterPerf7[ws.waiter_name].hours += Number(ws.hours_worked) || 0;
    });

    const perfEntries = Object.entries(waiterPerf7).filter(([, v]) => v.hours > 0);
    if (perfEntries.length >= 2) {
      const teamAvgPerHour = perfEntries.reduce((s, [, v]) => s + v.revenue, 0) / perfEntries.reduce((s, [, v]) => s + v.hours, 0);
      for (const [name, v] of perfEntries) {
        const perHour = v.revenue / v.hours;
        const deviation = ((perHour - teamAvgPerHour) / teamAvgPerHour) * 100;
        if (deviation <= -30) {
          anomalies.push(`⚠ Kellner ${name}: Ø ${perHour.toFixed(0)}€/h — ${Math.abs(deviation).toFixed(0)}% unter Team-Ø (${teamAvgPerHour.toFixed(0)}€/h) in den letzten 7 Tagen`);
        }
      }
    }

    // 5. Unusually high negative differences (> 2× std dev)
    const recentDiffs: { name: string; diff: number }[] = [];
    waiterShifts.forEach((ws: any) => {
      if (!last7SessionIds.has(ws.session_id)) return;
      if (ws.differenz != null) recentDiffs.push({ name: ws.waiter_name, diff: Number(ws.differenz) });
    });
    if (recentDiffs.length >= 3) {
      const mean = recentDiffs.reduce((s, d) => s + d.diff, 0) / recentDiffs.length;
      const stdDev = Math.sqrt(recentDiffs.reduce((s, d) => s + Math.pow(d.diff - mean, 2), 0) / recentDiffs.length);
      if (stdDev > 0) {
        for (const d of recentDiffs) {
          if (d.diff < mean - 2 * stdDev) {
            anomalies.push(`⚠ ${d.name}: Differenz ${d.diff.toFixed(2)}€ — ungewöhnlich niedrig (Ø ${mean.toFixed(2)}€ ± ${stdDev.toFixed(2)}€)`);
          }
        }
      }
    }

    // Build context string
    const contextParts: string[] = [];

    contextParts.push("=== RESTAURANTS ===");
    (restaurantsRes.data || []).forEach((r: any) => {
      contextParts.push(`${r.name} (${r.slug})`);
    });

    // Monthly summary BEFORE raw data
    contextParts.push("\n=== MONATLICHE ZUSAMMENFASSUNG (voraggregiert, alle verfügbaren Monate) ===");
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
    contextParts.push("\n=== MONATLICHES KELLNER-TRINKGELD RANKING (alle verfügbaren Monate) ===");
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
    contextParts.push("\n=== MONATLICHE KÜCHEN-STUNDEN (alle verfügbaren Monate) ===");
    contextParts.push("Monat | Restaurant | Mitarbeiter | Stunden");
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const hours = kitchenHoursAgg[key] || {};
      const sorted = Object.entries(hours).sort((a, b) => b[1] - a[1]);
      for (const [name, h] of sorted) {
        contextParts.push(`${month} | ${restaurant} | ${name} | ${h}h`);
      }
    }

    // Commission sections
    contextParts.push("\n=== MONATLICHE PROVISIONSBERECHNUNG (alle verfügbaren Monate) ===");
    contextParts.push("Monat | Restaurant | Schwellenwert | Prozent | Qual. Tage | Gesamt-Tage | Pool | Ges. Stunden | €/Stunde");
    const commKeys = Object.keys(commissionByMonthRestaurant).sort();
    for (const key of commKeys) {
      const [month, restaurant] = key.split("|");
      const c = commissionByMonthRestaurant[key];
      const totalHours = Object.values(c.staffHours).reduce((s, h) => s + h, 0);
      const hourlyRate = totalHours > 0 ? c.pool / totalHours : 0;
      contextParts.push(
        `${month} | ${restaurant} | ${c.minRevenue}€ | ${c.pct}% | ${c.qualDays} | ${c.totalDays} | ${c.pool.toFixed(2)}€ | ${totalHours.toFixed(1)}h | ${hourlyRate.toFixed(2)}€`
      );
    }

    contextParts.push("\n=== PROVISIONS-VERTEILUNG PRO MITARBEITER (alle verfügbaren Monate) ===");
    contextParts.push("Monat | Restaurant | Mitarbeiter | Stunden | Provision");
    for (const key of commKeys) {
      const [month, restaurant] = key.split("|");
      const c = commissionByMonthRestaurant[key];
      const totalHours = Object.values(c.staffHours).reduce((s, h) => s + h, 0);
      const hourlyRate = totalHours > 0 ? c.pool / totalHours : 0;
      const sorted = Object.entries(c.staffHours).sort((a, b) => b[1] - a[1]);
      for (const [name, hours] of sorted) {
        const commission = hourlyRate * hours;
        if (commission > 0) {
          contextParts.push(`${month} | ${restaurant} | ${name} | ${hours.toFixed(1)}h | ${commission.toFixed(2)}€`);
        }
      }
    }

    // Workforce hours & absences sections
    contextParts.push("\n=== MONATLICHE ARBEITSZEITEN PRO MITARBEITER (alle verfügbaren Monate, aus Zeiterfassung) ===");
    contextParts.push("Monat | Restaurant | Mitarbeiter | Abteilung | Gesamt-Std | Abend-Std | Nacht-Std | Tiefnacht-Std | So/Feiert-Std | Fehlzeiten");
    const wfKeys = Object.keys(workforceAgg).sort();
    for (const key of wfKeys) {
      const [month, restaurant] = key.split("|");
      const staff = workforceAgg[key];
      const sorted = Object.entries(staff).sort((a, b) => b[1].total - a[1].total);
      for (const [name, d] of sorted) {
        const absStr = Object.entries(d.absences).length > 0
          ? Object.entries(d.absences).map(([type, count]) => `${type}:${count}`).join(", ")
          : "-";
        contextParts.push(
          `${month} | ${restaurant} | ${name} | ${d.dept} | ${d.total.toFixed(1)}h | ${d.evening.toFixed(1)}h | ${d.night.toFixed(1)}h | ${d.nightDeep.toFixed(1)}h | ${d.sundayHoliday.toFixed(1)}h | ${absStr}`
        );
      }
    }

    // Zahlungsarten pro Monat
    contextParts.push("\n=== ZAHLUNGSARTEN PRO MONAT (Bar vs. Karte) ===");
    contextParts.push("Monat | Restaurant | Gesamt-Umsatz | Kreditkarten | Bar | Karten-Anteil-%");
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const a = monthlyAgg[key];
      const bar = a.pos_total - a.kreditkarten;
      const pct = a.pos_total > 0 ? ((a.kreditkarten / a.pos_total) * 100).toFixed(1) : "0";
      contextParts.push(`${month} | ${restaurant} | ${a.pos_total}€ | ${a.kreditkarten}€ | ${bar.toFixed(0)}€ | ${pct}%`);
    }

    // Kellner-Performance pro Monat
    contextParts.push("\n=== KELLNER-PERFORMANCE PRO MONAT (Umsatz/Stunde) ===");
    contextParts.push("Monat | Restaurant | Kellner | Umsatz | Stunden | €/Stunde | Ø Umsatz/Schicht | Schichten");
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const perf = waiterPerfAgg[key] || {};
      const sorted = Object.entries(perf).sort((a, b) => b[1].revenue - a[1].revenue);
      for (const [name, p] of sorted) {
        const perHour = p.hours > 0 ? (p.revenue / p.hours).toFixed(0) : "-";
        const perShift = p.shifts > 0 ? (p.revenue / p.shifts).toFixed(0) : "-";
        contextParts.push(`${month} | ${restaurant} | ${name} | ${p.revenue.toFixed(0)}€ | ${p.hours.toFixed(1)}h | ${perHour}€ | ${perShift}€ | ${p.shifts}`);
      }
    }

    // Restaurant-Vergleich pro Monat (only if multiple restaurants)
    const restaurantNames = Object.values(restaurantMap);
    if (restaurantNames.length >= 2) {
      contextParts.push("\n=== RESTAURANT-VERGLEICH PRO MONAT ===");
      contextParts.push("Monat | Kennzahl | " + restaurantNames.join(" | ") + " | Differenz");
      const months = [...new Set(sortedKeys.map(k => k.split("|")[0]))].sort();
      for (const month of months) {
        const vals: Record<string, Record<string, number>> = {};
        for (const rName of restaurantNames) {
          const k = `${month}|${rName}`;
          const a = monthlyAgg[k] || { pos_total: 0, kreditkarten: 0, gaeste: 0, sessions_count: 0 };
          const ea = monthlyExpAdv[k] || { ausgaben: 0 };
          const kt = kitchenTipAgg[k] || 0;
          vals[rName] = {
            Umsatz: a.pos_total,
            Gäste: a.gaeste,
            "Ø Umsatz/Gast": a.gaeste > 0 ? Math.round(a.pos_total / a.gaeste) : 0,
            "Karten-%": a.pos_total > 0 ? Math.round((a.kreditkarten / a.pos_total) * 100) : 0,
            "Küchen-TG": kt,
            Ausgaben: ea.ausgaben,
          };
        }
        const metrics = ["Umsatz", "Gäste", "Ø Umsatz/Gast", "Karten-%", "Küchen-TG", "Ausgaben"];
        for (const m of metrics) {
          const values = restaurantNames.map(r => vals[r]?.[m] || 0);
          const diff = values.length >= 2 ? values[0] - values[1] : 0;
          const suffix = m === "Karten-%" ? "%" : "€";
          contextParts.push(`${month} | ${m} | ${values.map(v => `${v}${suffix}`).join(" | ")} | ${diff > 0 ? "+" : ""}${diff}${suffix}`);
        }
      }
    }

    // Weather data context
    if (weatherData?.daily?.time) {
      const wd = weatherData.daily;
      contextParts.push("\n=== WETTERDATEN MÜNCHEN (letzte 90 Tage + 3 Tage Vorhersage) ===");
      contextParts.push("Datum | Max°C | Min°C | Niederschlag-mm | Wetter");
      for (let i = 0; i < wd.time.length; i++) {
        contextParts.push(
          `${wd.time[i]} | ${wd.temperature_2m_max[i]} | ${wd.temperature_2m_min[i]} | ${wd.precipitation_sum[i]} | ${weatherCodeLabel(wd.weathercode[i])}`
        );
      }

      // Weather-revenue correlation (last 30 days)
      const weatherByDate: Record<string, { maxTemp: number; precip: number; label: string }> = {};
      for (let i = 0; i < wd.time.length; i++) {
        weatherByDate[wd.time[i]] = {
          maxTemp: wd.temperature_2m_max[i],
          precip: wd.precipitation_sum[i],
          label: weatherCodeLabel(wd.weathercode[i]),
        };
      }

      contextParts.push("\n=== WETTER-UMSATZ-KORRELATION (letzte 30 Tage) ===");
      contextParts.push("Datum | Restaurant | Max°C | Niederschlag | Wetter | Umsatz | Gäste");
      const recentForCorrelation = sessions.filter((s: any) => s.session_date >= since30Str);
      recentForCorrelation.sort((a: any, b: any) => a.session_date.localeCompare(b.session_date));
      for (const s of recentForCorrelation) {
        const w = weatherByDate[s.session_date];
        if (!w) continue;
        contextParts.push(
          `${s.session_date} | ${restaurantMap[s.restaurant_id] || "?"} | ${w.maxTemp}°C | ${w.precip}mm | ${w.label} | ${s.pos_total || 0}€ | ${s.guest_count || 0}`
        );
      }
    }

    // Anomalien
    if (anomalies.length > 0) {
      contextParts.push("\n=== AKTUELLE ANOMALIEN UND AUFFÄLLIGKEITEN ===");
      anomalies.forEach(a => contextParts.push(a));
    }

    // Detailed absence records with exact dates (for "from when to when" questions)
    const absenceRecords: { name: string; restaurant: string; date: string; type: string }[] = [];
    ztShifts.forEach((z: any) => {
      if (!z.absence_type) return;
      const staffName = staffById[z.employee_id]?.name || "?";
      const rids = staffToRestaurants[z.employee_id] || [];
      for (const rid of rids) {
        absenceRecords.push({
          name: staffName,
          restaurant: restaurantMap[rid] || "?",
          date: z.shift_date,
          type: z.absence_type,
        });
      }
    });

    if (absenceRecords.length > 0) {
      // Group consecutive absences into date ranges
      absenceRecords.sort((a, b) => `${a.name}|${a.restaurant}|${a.type}|${a.date}`.localeCompare(`${b.name}|${b.restaurant}|${b.type}|${b.date}`));

      type AbsenceRange = { name: string; restaurant: string; type: string; from: string; to: string };
      const ranges: AbsenceRange[] = [];
      let current: AbsenceRange | null = null;

      for (const rec of absenceRecords) {
        if (current && current.name === rec.name && current.restaurant === rec.restaurant && current.type === rec.type) {
          // Check if consecutive (next day)
          const prevDate = new Date(current.to);
          prevDate.setDate(prevDate.getDate() + 1);
          const prevStr = prevDate.toISOString().split("T")[0];
          if (rec.date === prevStr) {
            current.to = rec.date;
            continue;
          }
        }
        if (current) ranges.push(current);
        current = { name: rec.name, restaurant: rec.restaurant, type: rec.type, from: rec.date, to: rec.date };
      }
      if (current) ranges.push(current);

      contextParts.push("\n=== FEHLZEITEN-ZEITRÄUME (exakte Datumsbereiche) ===");
      contextParts.push("Mitarbeiter | Restaurant | Typ | Von | Bis | Tage");
      for (const r of ranges) {
        const fromDate = new Date(r.from);
        const toDate = new Date(r.to);
        const days = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        contextParts.push(`${r.name} | ${r.restaurant} | ${r.type} | ${r.from} | ${r.to} | ${days}`);
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

    contextParts.push("\n=== MITARBEITER (Stammdaten) ===");
    contextParts.push("Name | Rolle | Aktiv | Pool | Minijob | Eintrittsdatum | Austrittsdatum | Urlaub-Vertrag | Urlaub-Vorjahr | Urlaub-Aktuell | Urlaub-Genommen | Krankheitstage");
    allStaff.forEach((s: any) => {
      contextParts.push(
        `${s.name} | ${s.role} | ${s.is_active ? "ja" : "nein"} | ${s.participates_in_pool ? "ja" : "nein"} | ${s.is_minijob ? "ja" : "nein"} | ${s.employment_start || "-"} | ${s.employment_end || "-"} | ${s.vacation_days_contractual ?? "-"} | ${s.vacation_days_previous ?? "-"} | ${s.vacation_days_current ?? "-"} | ${s.vacation_days_taken ?? "-"} | ${s.sick_days_total ?? "-"}`
      );
    });

    const dataContext = contextParts.join("\n");

    const systemPrompt = `Du bist ein hilfreicher Assistent für ein Restaurant-Kassensystem. Du antwortest auf Deutsch.
Du hast Zugriff auf die folgenden echten Daten:
- **Aggregierte Monatsdaten**: Der gesamte verfügbare Zeitraum (alle historischen Monate)
- **Rohdaten**: Nur die letzten 30 Tage (Sessions, Schichten, Ausgaben, Vorschüsse)

${dataContext}

Wichtige Regeln:
- Die MONATLICHE ZUSAMMENFASSUNG, das KELLNER-TRINKGELD RANKING und die KÜCHEN-STUNDEN enthalten voraggregierte, korrekte Summen über den gesamten verfügbaren Zeitraum. Verwende IMMER diese Summen wenn nach Monats-Totalen, Rankings, Stunden-Summen, Jahresvergleichen oder Langzeittrends gefragt wird, anstatt selbst aus den Rohdaten zu rechnen.
- Die MONATLICHE PROVISIONSBERECHNUNG enthält voraggregierte Provisionsdaten über alle verfügbaren Monate. Verwende diese für alle Provisionsfragen. Provisionen basieren auf einem Schwellenwert-System: nur Tage, an denen der Durchschnittsumsatz pro Service-Mitarbeiter den Schwellenwert erreicht, tragen zum Provisions-Pool bei. Der Pool wird proportional zu den Arbeitsstunden (aus der Zeiterfassung) verteilt. Die PROVISIONS-VERTEILUNG zeigt die Aufteilung pro Mitarbeiter.
- Die MONATLICHEN ARBEITSZEITEN enthalten die vollständigen Zeiterfassungsdaten pro Mitarbeiter über alle verfügbaren Monate: Gesamtstunden, Abendstunden (20-24 Uhr, 25% SFN-Zuschlag), Nachtstunden (0-4/24-0 Uhr, 25% Zuschlag), Tiefnachtstunden (0-4 Uhr, 40% Zuschlag), Sonn-/Feiertagsstunden. Fehlzeiten werden nach Typ (Urlaub, Krank, Frei, etc.) als Anzahl Tage angegeben.
- Die FEHLZEITEN-ZEITRÄUME zeigen exakte Von-Bis-Datumsbereiche für jede Abwesenheit über alle verfügbaren Daten. Verwende diese Tabelle wenn nach konkreten Urlaubszeiträumen oder Abwesenheitsdaten gefragt wird.
- Die MITARBEITER-Stammdaten enthalten Informationen zu Rolle, Beschäftigungsart (Minijob), Eintritts-/Austrittsdatum, sowie den Urlaubsanspruch und die genommenen Urlaubs-/Krankheitstage.
- Die ZAHLUNGSARTEN zeigen den monatlichen Bar- vs. Karten-Anteil pro Restaurant. Verwende diese Tabelle für Fragen nach Zahlungsarten, Bargeld-Anteil, Kreditkarten-Quote.
- Die KELLNER-PERFORMANCE zeigt Umsatz pro Stunde, Umsatz pro Schicht und Schichtanzahl pro Kellner pro Monat. Verwende diese für Fragen nach Mitarbeiter-Effizienz, wer am meisten Umsatz pro Stunde macht, Performance-Vergleiche zwischen Kellnern.
- Der RESTAURANT-VERGLEICH zeigt die Restaurants nebeneinander mit Umsatz, Gästen, Ø Umsatz/Gast, Karten-Anteil, Küchen-TG und Ausgaben. Verwende diese Tabelle für direkte Benchmarking-Fragen (z.B. "Vergleiche Spicery und YUM").
- Die ANOMALIEN UND AUFFÄLLIGKEITEN enthalten automatisch erkannte Abweichungen der letzten 7 Tage. Erwähne relevante Anomalien proaktiv bei allgemeinen Fragen wie "Wie läuft's?" oder "Gibt es etwas Auffälliges?". Warte nicht darauf dass der Nutzer explizit danach fragt.
- Die WETTERDATEN zeigen Temperatur und Niederschlag für München (Standort beider Restaurants). Nutze die WETTER-UMSATZ-KORRELATION um Zusammenhänge zwischen Wetter und Umsatz/Gästezahlen zu analysieren. Besonders relevant für Terrassen-Tage (warm + trocken). Wenn keine Wetterdaten geladen werden konnten, weise darauf hin.
- Bei Fragen nach Jahresvergleichen, Trends oder längeren Zeiträumen: Nutze die monatlichen Zusammenfassungen — diese enthalten alle verfügbaren historischen Monate.
- Die Rohdaten (Sessions, Schichten, Ausgaben, Vorschüsse) sind nur für die letzten 30 Tage verfügbar. Für ältere Zeiträume nutze die monatlichen Aggregationen.
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
