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
  if (ids.length === 0) return [];
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

    // Date calculations
    const now = new Date();
    const berlin = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const since30 = new Date(berlin); since30.setDate(berlin.getDate() - 30);
    const since30Str = fmt(since30);
    const since14 = new Date(berlin); since14.setDate(berlin.getDate() - 14);
    const since14Str = fmt(since14);
    const since7 = new Date(berlin); since7.setDate(berlin.getDate() - 7);
    const since7Str = fmt(since7);
    const todayStr = fmt(berlin);

    const sixMonthsAgo = new Date(berlin);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = fmt(sixMonthsAgo);

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

    // === PHASE 1: All independent queries in parallel ===
    // KEY OPTIMIZATION: Use mv_daily_summary for historical aggregation,
    // only load raw sessions for last 30 days (commission, tips, raw context)
    const [
      mvSummaryRes,
      recentSessionsRes,
      staffRes,
      restaurantsRes,
      settingsRes,
      staffRestaurantsRes,
      weatherData,
      holidaysRes,
      ztShiftsRes,
    ] = await Promise.all([
      // Materialized view: pre-aggregated daily data (ALL history, very fast)
      supabase
        .from("mv_daily_summary")
        .select("*")
        .in("restaurant_id", restaurant_ids)
        .order("session_date", { ascending: false }),
      // Raw sessions: only last 30 days for commission calc + raw context
      supabase
        .from("sessions")
        .select("id, session_date, restaurant_id, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, guest_count, vouchers_sold, vouchers_redeemed, finedine_vouchers, einladung, sonstige_einnahme, notes, created_by_name")
        .in("restaurant_id", restaurant_ids)
        .gte("session_date", since30Str)
        .order("session_date", { ascending: false })
        .limit(5000),
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
      // Weather: only 30 days + 1 day forecast
      fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=48.14&longitude=11.58&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe/Berlin&past_days=30&forecast_days=1"
      ).then(r => r.json()).catch(() => null),
      supabase
        .from("bavarian_holidays")
        .select("holiday_date, name, surcharge_rate, from_hour")
        .order("holiday_date"),
      supabase
        .from("zt_shifts")
        .select("employee_id, shift_date, total_hours, evening_hours, night_hours, night_deep_hours, sunday_holiday_hours, is_holiday, department, absence_type")
        .gte("shift_date", sixMonthsAgoStr)
        .order("shift_date", { ascending: false })
        .limit(10000),
    ]);

    const mvSummary = mvSummaryRes.data || [];
    const recentSessions = recentSessionsRes.data || [];
    const recentSessionIds = recentSessions.map((s: any) => s.id);
    const ztShifts = ztShiftsRes.data || [];

    // === PHASE 2: Only load raw shift data for last 30 days (for tips, commission, raw context) ===
    const [waiterShifts, kitchenShifts, expenses, advances] = await Promise.all([
      batchIn(supabase, "waiter_shifts",
        "session_id, waiter_name, staff_id, second_waiter_name, additional_waiters, pos_sales, kassiert_brutto, differenz, kitchen_tip, hours_worked, participates_in_pool",
        "session_id", recentSessionIds),
      batchIn(supabase, "kitchen_shifts",
        "session_id, staff_name, hours_worked",
        "session_id", recentSessionIds),
      batchIn(supabase, "expenses",
        "session_id, amount, description",
        "session_id", recentSessionIds),
      batchIn(supabase, "advances",
        "session_id, amount, staff_name",
        "session_id", recentSessionIds),
    ]);

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

    // Build session → restaurant mapping (recent only)
    const sessionRestaurant: Record<string, string> = {};
    recentSessions.forEach((s: any) => { sessionRestaurant[s.id] = s.restaurant_id; });

    // ==========================================
    // MONTHLY SUMMARY FROM MATERIALIZED VIEW (fast path)
    // ==========================================
    const monthlyAgg: Record<string, Record<string, number>> = {};
    const monthlyExpAdv: Record<string, { ausgaben: number; vorschuesse: number }> = {};
    const kitchenTipAgg: Record<string, number> = {};

    mvSummary.forEach((row: any) => {
      const month = row.session_date.slice(0, 7);
      const restaurant = restaurantMap[row.restaurant_id] || "?";
      const key = `${month}|${restaurant}`;

      if (!monthlyAgg[key]) {
        monthlyAgg[key] = { pos_total: 0, kreditkarten: 0, ordersmart: 0, wolt: 0, gutscheine_vk: 0, gutscheine_einl: 0, finedine: 0, einladung: 0, sonstige_einnahme: 0, gaeste: 0, sessions_count: 0 };
      }
      const a = monthlyAgg[key];
      a.pos_total += Number(row.pos_total) || 0;
      a.kreditkarten += Number(row.card_total) || 0;
      a.ordersmart += Number(row.ordersmart_revenue) || 0;
      a.wolt += Number(row.wolt_revenue) || 0;
      a.gutscheine_vk += Number(row.vouchers_sold) || 0;
      a.gutscheine_einl += Number(row.vouchers_redeemed) || 0;
      a.finedine += Number(row.finedine_vouchers) || 0;
      a.einladung += Number(row.einladung) || 0;
      a.sonstige_einnahme += Number(row.sonstige_einnahme) || 0;
      a.gaeste += Number(row.guest_count) || 0;
      a.sessions_count += 1;

      if (!monthlyExpAdv[key]) monthlyExpAdv[key] = { ausgaben: 0, vorschuesse: 0 };
      monthlyExpAdv[key].ausgaben += Number(row.total_expenses) || 0;
      monthlyExpAdv[key].vorschuesse += Number(row.total_advances) || 0;

      kitchenTipAgg[key] = (kitchenTipAgg[key] || 0) + (Number(row.total_kitchen_tip) || 0);
    });

    // ==========================================
    // WAITER TIPS & PERFORMANCE (from raw data, last 30 days)
    // ==========================================
    const sessionMonthRestaurant: Record<string, { month: string; restaurant: string; restaurantId: string; date: string }> = {};
    recentSessions.forEach((s: any) => {
      sessionMonthRestaurant[s.id] = { month: s.session_date.slice(0, 7), restaurant: restaurantMap[s.restaurant_id] || "?", restaurantId: s.restaurant_id, date: s.session_date };
    });

    const waiterTipAgg: Record<string, Record<string, number>> = {};
    const waiterHoursAgg: Record<string, Record<string, number>> = {};
    const kitchenHoursAgg: Record<string, Record<string, number>> = {};

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

      const sessionPool = shiftsInSession.reduce((sum: number, s: any) => sum + (s.differenz || 0), 0);
      const waiterShareCount = shiftsInSession.reduce((count: number, s: any) => {
        if (!s.participates_in_pool) return count;
        return count + 1 + (s.additional_waiters?.length || 0);
      }, 0);

      if (waiterShareCount > 0 && sessionPool !== 0) {
        const tipPerWaiter = sessionPool / waiterShareCount;
        shiftsInSession.forEach((ws: any) => {
          waiterHoursAgg[key][ws.waiter_name] = (waiterHoursAgg[key][ws.waiter_name] || 0) + (ws.hours_worked || 0);
          if (!ws.participates_in_pool) return;
          waiterTipAgg[key][ws.waiter_name] = (waiterTipAgg[key][ws.waiter_name] || 0) + tipPerWaiter;
          for (const name of (ws.additional_waiters || [])) {
            waiterTipAgg[key][name] = (waiterTipAgg[key][name] || 0) + tipPerWaiter;
          }
        });
      } else {
        shiftsInSession.forEach((ws: any) => {
          waiterHoursAgg[key][ws.waiter_name] = (waiterHoursAgg[key][ws.waiter_name] || 0) + (ws.hours_worked || 0);
        });
      }
    }

    kitchenShifts.forEach((ks: any) => {
      const info = sessionMonthRestaurant[ks.session_id];
      if (!info) return;
      const key = `${info.month}|${info.restaurant}`;
      if (!kitchenHoursAgg[key]) kitchenHoursAgg[key] = {};
      kitchenHoursAgg[key][ks.staff_name] = (kitchenHoursAgg[key][ks.staff_name] || 0) + (ks.hours_worked || 0);
    });

    // ==========================================
    // COMMISSION CALCULATION (from raw data, last 30 days)
    // ==========================================
    const shiftsByRestDate: Record<string, any[]> = {};
    waiterShifts.forEach((ws: any) => {
      const info = sessionMonthRestaurant[ws.session_id];
      if (!info) return;
      const key = `${info.restaurantId}:${info.date}`;
      if (!shiftsByRestDate[key]) shiftsByRestDate[key] = [];
      shiftsByRestDate[key].push(ws);
    });

    const commissionByMonthRestaurant: Record<string, {
      restaurantId: string; minRevenue: number; pct: number;
      qualDays: number; totalDays: number; pool: number;
      staffHours: Record<string, number>;
    }> = {};
    const daysByMonthRest: Record<string, { dates: Set<string>; qualDays: number; pool: number }> = {};

    // Staff to restaurants mapping
    const staffToRestaurants: Record<string, string[]> = {};
    (staffRestaurantsRes.data || []).forEach((sr: any) => {
      if (!staffToRestaurants[sr.staff_id]) staffToRestaurants[sr.staff_id] = [];
      if (!staffToRestaurants[sr.staff_id].includes(sr.restaurant_id)) {
        staffToRestaurants[sr.staff_id].push(sr.restaurant_id);
      }
    });

    const staffDeptByRest: Record<string, string> = {};
    (staffRestaurantsRes.data || []).forEach((sr: any) => {
      staffDeptByRest[`${sr.staff_id}:${sr.restaurant_id}`] = sr.zt_department || "?";
    });

    for (const [rdKey, shifts] of Object.entries(shiftsByRestDate)) {
      const [restaurantId, date] = rdKey.split(":");
      const month = date.slice(0, 7);
      const restaurant = restaurantMap[restaurantId] || "?";
      const mrKey = `${month}|${restaurant}`;
      const settings = commissionSettings[restaurantId] || { minRevenue: 1200, pct: 5 };

      if (!daysByMonthRest[mrKey]) {
        daysByMonthRest[mrKey] = { dates: new Set(), qualDays: 0, pool: 0 };
        commissionByMonthRestaurant[mrKey] = {
          restaurantId, minRevenue: settings.minRevenue, pct: settings.pct,
          qualDays: 0, totalDays: 0, pool: 0, staffHours: {},
        };
      }

      const dayData = daysByMonthRest[mrKey];
      dayData.dates.add(date);

      const staffSet = new Set<string>();
      let dayRevenue = 0;
      for (const ws of shifts) {
        if (ws.staff_id && glStaffIds.has(ws.staff_id)) continue;
        staffSet.add(ws.staff_id || ws.waiter_name);
        dayRevenue += Number(ws.pos_sales) || 0;
        if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
          staffSet.add(staffNameToId.get(ws.second_waiter_name.toLowerCase()) || `s:${ws.second_waiter_name}`);
        }
        if (ws.additional_waiters?.length) {
          for (const aw of ws.additional_waiters) {
            if (aw && !isGlByName(aw)) staffSet.add(staffNameToId.get(aw.toLowerCase()) || `s:${aw}`);
          }
        }
      }

      const staffCount = staffSet.size;
      if (staffCount > 0) {
        const dayAvg = dayRevenue / staffCount;
        if (dayAvg >= settings.minRevenue) {
          const excess = dayRevenue - (settings.minRevenue * staffCount);
          dayData.qualDays++;
          dayData.pool += Math.max(0, excess * (settings.pct / 100));
        }
      }
    }

    // ZT hours by month|restaurant|staff for commission (Service only)
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

    for (const [mrKey, dayData] of Object.entries(daysByMonthRest)) {
      const comm = commissionByMonthRestaurant[mrKey];
      if (!comm) continue;
      comm.totalDays = dayData.dates.size;
      comm.qualDays = dayData.qualDays;
      comm.pool = dayData.pool;
      comm.staffHours = ztHoursMonthRest[mrKey] || {};
    }

    // ==========================================
    // WORKFORCE DATA (from zt_shifts)
    // ==========================================
    type WorkforceEntry = { total: number; evening: number; night: number; nightDeep: number; sundayHoliday: number; absences: Record<string, number>; dept: string };
    const workforceAgg: Record<string, Record<string, WorkforceEntry>> = {};

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

    // WAITER PERFORMANCE (from raw data, last 30 days)
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
    // ANOMALY DETECTION (last 7 days vs previous 7 days, from materialized view)
    // ==========================================
    const anomalies: string[] = [];

    for (const rid of restaurant_ids) {
      const rName = restaurantMap[rid] || "?";
      const last7 = mvSummary.filter((r: any) => r.restaurant_id === rid && r.session_date >= since7Str && r.session_date <= todayStr);
      const prev7 = mvSummary.filter((r: any) => r.restaurant_id === rid && r.session_date >= since14Str && r.session_date < since7Str);

      const last7Revenue = last7.reduce((s: number, r: any) => s + (Number(r.pos_total) || 0), 0);
      const prev7Revenue = prev7.reduce((s: number, r: any) => s + (Number(r.pos_total) || 0), 0);
      if (prev7Revenue > 0) {
        const revChange = ((last7Revenue - prev7Revenue) / prev7Revenue) * 100;
        if (Math.abs(revChange) >= 15) {
          anomalies.push(`⚠ Umsatz 7T (${rName}): ${last7Revenue.toFixed(0)}€ — ${Math.abs(revChange).toFixed(0)}% ${revChange > 0 ? "über" : "unter"} Vorwoche (${prev7Revenue.toFixed(0)}€)`);
        }
      }

      const last7Guests = last7.reduce((s: number, r: any) => s + (Number(r.guest_count) || 0), 0);
      const prev7Guests = prev7.reduce((s: number, r: any) => s + (Number(r.guest_count) || 0), 0);
      if (prev7Guests > 0) {
        const guestChange = ((last7Guests - prev7Guests) / prev7Guests) * 100;
        if (Math.abs(guestChange) >= 10) {
          anomalies.push(`ℹ Gäste ${rName}: ${guestChange > 0 ? "+" : ""}${guestChange.toFixed(0)}% ggü. Vorwoche (${last7Guests} vs ${prev7Guests})`);
        }
      }

      const last7Dates = new Set(last7.map((r: any) => r.session_date));
      const missingDays: string[] = [];
      for (let d = new Date(since7); d <= berlin; d.setDate(d.getDate() + 1)) {
        const ds = fmt(d);
        if (!last7Dates.has(ds) && ds <= todayStr) missingDays.push(ds);
      }
      if (missingDays.length > 0 && missingDays.length <= 3) {
        anomalies.push(`ℹ Fehlende Abrechnungen (${rName}): ${missingDays.join(", ")}`);
      }
    }

    // Waiter performance deviations (from raw waiter shifts, last 7 days)
    const last7SessionIds = new Set(recentSessions.filter((s: any) => s.session_date >= since7Str && s.session_date <= todayStr).map((s: any) => s.id));
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
          anomalies.push(`⚠ ${name}: Ø ${perHour.toFixed(0)}€/h — ${Math.abs(deviation).toFixed(0)}% unter Team-Ø (${teamAvgPerHour.toFixed(0)}€/h)`);
        }
      }
    }

    // High negative differences
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
            anomalies.push(`⚠ ${d.name}: Differenz ${d.diff.toFixed(2)}€ — ungewöhnlich (Ø ${mean.toFixed(2)}€)`);
          }
        }
      }
    }

    // ==========================================
    // BUILD CONTEXT STRING (optimized for minimal tokens)
    // ==========================================
    const ctx: string[] = [];

    ctx.push("=== RESTAURANTS ===");
    (restaurantsRes.data || []).forEach((r: any) => ctx.push(`${r.name} (${r.slug})`));

    // Bavarian holidays (compact)
    const holidays = holidaysRes.data || [];
    if (holidays.length > 0) {
      ctx.push("\n=== FEIERTAGE ===");
      holidays.forEach((h: any) => {
        ctx.push(`${h.holiday_date} ${h.name} ${(h.surcharge_rate * 100).toFixed(0)}% ${h.from_hour != null ? "ab " + h.from_hour + "h" : "ganztägig"}`);
      });
    }

    // Monthly summary (from materialized view)
    ctx.push("\n=== MONATSZUSAMMENFASSUNG ===");
    ctx.push("Monat|Rest|Tage|Umsatz|Karten|OS|Wolt|GVK|GEinl|FD|Einl|SoE|Gäste|Ausg|Vorsch|KüchenTG");
    const sortedKeys = Object.keys(monthlyAgg).sort();
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const a = monthlyAgg[key];
      const ea = monthlyExpAdv[key] || { ausgaben: 0, vorschuesse: 0 };
      const kt = kitchenTipAgg[key] || 0;
      ctx.push(`${month}|${restaurant}|${a.sessions_count}|${a.pos_total}|${a.kreditkarten}|${a.ordersmart}|${a.wolt}|${a.gutscheine_vk}|${a.gutscheine_einl}|${a.finedine}|${a.einladung}|${a.sonstige_einnahme}|${a.gaeste}|${ea.ausgaben}|${ea.vorschuesse}|${kt}`);
    }

    // Waiter tip ranking (last 30 days only)
    ctx.push("\n=== KELLNER-TG RANKING (30T) ===");
    ctx.push("Monat|Rest|Name|TG|Std");
    for (const key of Object.keys(waiterTipAgg).sort()) {
      const [month, restaurant] = key.split("|");
      const tips = waiterTipAgg[key] || {};
      const hours = waiterHoursAgg[key] || {};
      const sorted = Object.entries(tips).sort((a, b) => b[1] - a[1]);
      for (const [name, tip] of sorted) {
        ctx.push(`${month}|${restaurant}|${name}|${tip.toFixed(0)}|${(hours[name] || 0).toFixed(0)}`);
      }
    }

    // Kitchen hours (last 30 days)
    ctx.push("\n=== KÜCHEN-STD (30T) ===");
    for (const key of Object.keys(kitchenHoursAgg).sort()) {
      const [month, restaurant] = key.split("|");
      const hours = kitchenHoursAgg[key] || {};
      for (const [name, h] of Object.entries(hours).sort((a, b) => (b[1] as number) - (a[1] as number))) {
        ctx.push(`${month}|${restaurant}|${name}|${(h as number).toFixed(0)}h`);
      }
    }

    // Commission (last 30 days)
    ctx.push("\n=== PROVISION (30T) ===");
    ctx.push("Monat|Rest|Schwelle|%|QualT|GesamtT|Pool|Std|€/h");
    const commKeys = Object.keys(commissionByMonthRestaurant).sort();
    for (const key of commKeys) {
      const [month, restaurant] = key.split("|");
      const c = commissionByMonthRestaurant[key];
      const totalHours = Object.values(c.staffHours).reduce((s, h) => s + h, 0);
      const hourlyRate = totalHours > 0 ? c.pool / totalHours : 0;
      ctx.push(`${month}|${restaurant}|${c.minRevenue}|${c.pct}|${c.qualDays}|${c.totalDays}|${c.pool.toFixed(0)}|${totalHours.toFixed(0)}|${hourlyRate.toFixed(2)}`);
    }

    // Commission distribution
    ctx.push("\n=== PROV-VERTEILUNG ===");
    for (const key of commKeys) {
      const [month, restaurant] = key.split("|");
      const c = commissionByMonthRestaurant[key];
      const totalHours = Object.values(c.staffHours).reduce((s, h) => s + h, 0);
      const hourlyRate = totalHours > 0 ? c.pool / totalHours : 0;
      for (const [name, hours] of Object.entries(c.staffHours).sort((a, b) => b[1] - a[1])) {
        const commission = hourlyRate * hours;
        if (commission > 0) ctx.push(`${month}|${restaurant}|${name}|${hours.toFixed(0)}h|${commission.toFixed(0)}€`);
      }
    }

    // Workforce
    ctx.push("\n=== ARBEITSZEITEN ===");
    ctx.push("Monat|Rest|Name|Abt|Ges|Abend|Nacht|TiefN|SoFei|Fehl");
    const wfKeys = Object.keys(workforceAgg).sort();
    for (const key of wfKeys) {
      const [month, restaurant] = key.split("|");
      for (const [name, d] of Object.entries(workforceAgg[key]).sort((a, b) => b[1].total - a[1].total)) {
        const absStr = Object.entries(d.absences).length > 0
          ? Object.entries(d.absences).map(([t, c]) => `${t}:${c}`).join(",")
          : "-";
        ctx.push(`${month}|${restaurant}|${name}|${d.dept}|${d.total.toFixed(0)}|${d.evening.toFixed(0)}|${d.night.toFixed(0)}|${d.nightDeep.toFixed(0)}|${d.sundayHoliday.toFixed(0)}|${absStr}`);
      }
    }

    // Payment types (from materialized view monthly agg)
    ctx.push("\n=== ZAHLUNGSARTEN ===");
    for (const key of sortedKeys) {
      const [month, restaurant] = key.split("|");
      const a = monthlyAgg[key];
      const bar = a.pos_total - a.kreditkarten;
      const pct = a.pos_total > 0 ? ((a.kreditkarten / a.pos_total) * 100).toFixed(0) : "0";
      ctx.push(`${month}|${restaurant}|Umsatz:${a.pos_total}|Karte:${a.kreditkarten}|Bar:${bar.toFixed(0)}|${pct}%`);
    }

    // Waiter performance (last 30 days)
    ctx.push("\n=== KELLNER-PERF (30T) ===");
    for (const key of Object.keys(waiterPerfAgg).sort()) {
      const [month, restaurant] = key.split("|");
      const perf = waiterPerfAgg[key] || {};
      for (const [name, p] of Object.entries(perf).sort((a, b) => b[1].revenue - a[1].revenue)) {
        const perHour = p.hours > 0 ? (p.revenue / p.hours).toFixed(0) : "-";
        ctx.push(`${month}|${restaurant}|${name}|${p.revenue.toFixed(0)}€|${p.hours.toFixed(0)}h|${perHour}€/h|${p.shifts}S`);
      }
    }

    // Restaurant comparison (from materialized view)
    const restaurantNames = Object.values(restaurantMap);
    if (restaurantNames.length >= 2) {
      ctx.push("\n=== REST-VERGLEICH ===");
      const months = [...new Set(sortedKeys.map(k => k.split("|")[0]))].sort();
      for (const month of months) {
        const vals: Record<string, Record<string, number>> = {};
        for (const rName of restaurantNames) {
          const k = `${month}|${rName}`;
          const a = monthlyAgg[k] || { pos_total: 0, kreditkarten: 0, gaeste: 0 };
          const ea = monthlyExpAdv[k] || { ausgaben: 0 };
          const kt = kitchenTipAgg[k] || 0;
          vals[rName] = {
            U: a.pos_total, G: a.gaeste,
            "U/G": a.gaeste > 0 ? Math.round(a.pos_total / a.gaeste) : 0,
            "K%": a.pos_total > 0 ? Math.round((a.kreditkarten / a.pos_total) * 100) : 0,
            KTG: kt, Aus: ea.ausgaben,
          };
        }
        for (const m of ["U", "G", "U/G", "K%", "KTG", "Aus"]) {
          const values = restaurantNames.map(r => vals[r]?.[m] || 0);
          ctx.push(`${month}|${m}|${restaurantNames.map((r, i) => `${r}:${values[i]}`).join("|")}`);
        }
      }
    }

    // Weather (compact, last 30 days + correlation)
    if (weatherData?.daily?.time) {
      const wd = weatherData.daily;
      const weatherByDate: Record<string, { maxTemp: number; precip: number; label: string }> = {};
      ctx.push("\n=== WETTER ===");
      for (let i = 0; i < wd.time.length; i++) {
        weatherByDate[wd.time[i]] = { maxTemp: wd.temperature_2m_max[i], precip: wd.precipitation_sum[i], label: weatherCodeLabel(wd.weathercode[i]) };
        ctx.push(`${wd.time[i]}|${wd.temperature_2m_max[i]}°|${wd.precipitation_sum[i]}mm|${weatherCodeLabel(wd.weathercode[i])}`);
      }

      // Weather-revenue correlation (last 14 days, from materialized view)
      ctx.push("\n=== WETTER-UMSATZ ===");
      const recentMv = mvSummary.filter((r: any) => r.session_date >= since14Str).sort((a: any, b: any) => a.session_date.localeCompare(b.session_date));
      for (const row of recentMv) {
        const w = weatherByDate[row.session_date];
        if (!w) continue;
        ctx.push(`${row.session_date}|${restaurantMap[row.restaurant_id]}|${w.maxTemp}°|${w.precip}mm|${w.label}|${row.pos_total || 0}€|${row.guest_count || 0}G`);
      }
    }

    // Anomalies
    if (anomalies.length > 0) {
      ctx.push("\n=== ANOMALIEN ===");
      anomalies.forEach(a => ctx.push(a));
    }

    // Absence ranges (from zt_shifts)
    const absenceRecords: { name: string; restaurant: string; date: string; type: string }[] = [];
    ztShifts.forEach((z: any) => {
      if (!z.absence_type) return;
      const staffName = staffById[z.employee_id]?.name || "?";
      const rids = staffToRestaurants[z.employee_id] || [];
      for (const rid of rids) {
        absenceRecords.push({ name: staffName, restaurant: restaurantMap[rid] || "?", date: z.shift_date, type: z.absence_type });
      }
    });

    if (absenceRecords.length > 0) {
      absenceRecords.sort((a, b) => `${a.name}|${a.restaurant}|${a.type}|${a.date}`.localeCompare(`${b.name}|${b.restaurant}|${b.type}|${b.date}`));
      type AbsenceRange = { name: string; restaurant: string; type: string; from: string; to: string };
      const ranges: AbsenceRange[] = [];
      let current: AbsenceRange | null = null;
      for (const rec of absenceRecords) {
        if (current && current.name === rec.name && current.restaurant === rec.restaurant && current.type === rec.type) {
          const prevDate = new Date(current.to); prevDate.setDate(prevDate.getDate() + 1);
          if (rec.date === fmt(prevDate)) { current.to = rec.date; continue; }
        }
        if (current) ranges.push(current);
        current = { name: rec.name, restaurant: rec.restaurant, type: rec.type, from: rec.date, to: rec.date };
      }
      if (current) ranges.push(current);

      ctx.push("\n=== FEHLZEITEN ===");
      for (const r of ranges) {
        const days = Math.round((new Date(r.to).getTime() - new Date(r.from).getTime()) / 86400000) + 1;
        ctx.push(`${r.name}|${r.restaurant}|${r.type}|${r.from}→${r.to}|${days}T`);
      }
    }

    // RAW DATA: limited to last 14 days for detailed context
    const sessionInfoMap: Record<string, { date: string; restaurant: string }> = {};
    recentSessions.forEach((s: any) => {
      sessionInfoMap[s.id] = { date: s.session_date, restaurant: restaurantMap[s.restaurant_id] || "?" };
    });

    const last14Sessions = recentSessions.filter((s: any) => s.session_date >= since14Str);
    const last14SessionIds = new Set(last14Sessions.map((s: any) => s.id));

    ctx.push("\n=== SESSIONS (14T) ===");
    last14Sessions.forEach((s: any) => {
      const cards = (s.terminal_1_total || 0) + (s.terminal_2_total || 0);
      ctx.push(`${s.session_date}|${restaurantMap[s.restaurant_id]}|U:${s.pos_total || 0}|K:${cards}|OS:${s.ordersmart_revenue || 0}|W:${s.wolt_revenue || 0}|G:${s.guest_count || 0}${s.notes ? "|N:" + s.notes : ""}`);
    });

    ctx.push("\n=== KELLNER (14T) ===");
    waiterShifts.filter((ws: any) => last14SessionIds.has(ws.session_id)).forEach((ws: any) => {
      const info = sessionInfoMap[ws.session_id];
      if (!info) return;
      ctx.push(`${info.date}|${info.restaurant}|${ws.waiter_name}|POS:${ws.pos_sales || 0}|Kass:${ws.kassiert_brutto || 0}|Diff:${ws.differenz || 0}|KTG:${ws.kitchen_tip || 0}|${ws.hours_worked || "-"}h`);
    });

    ctx.push("\n=== KÜCHE (14T) ===");
    kitchenShifts.filter((ks: any) => last14SessionIds.has(ks.session_id)).forEach((ks: any) => {
      const info = sessionInfoMap[ks.session_id];
      if (!info) return;
      ctx.push(`${info.date}|${info.restaurant}|${ks.staff_name}|${ks.hours_worked || 0}h`);
    });

    ctx.push("\n=== AUSGABEN (14T) ===");
    expenses.filter((e: any) => last14SessionIds.has(e.session_id)).forEach((e: any) => {
      const info = sessionInfoMap[e.session_id];
      if (!info) return;
      ctx.push(`${info.date}|${info.restaurant}|${e.amount}€|${e.description}`);
    });

    ctx.push("\n=== VORSCHÜSSE (14T) ===");
    advances.filter((a: any) => last14SessionIds.has(a.session_id)).forEach((a: any) => {
      const info = sessionInfoMap[a.session_id];
      if (!info) return;
      ctx.push(`${info.date}|${info.restaurant}|${a.staff_name}|${a.amount}€`);
    });

    // Staff master data (compact)
    ctx.push("\n=== MITARBEITER ===");
    allStaff.forEach((s: any) => {
      ctx.push(`${s.name}|${s.role}|${s.is_active ? "A" : "I"}|${s.is_minijob ? "MJ" : "-"}|Ein:${s.employment_start || "-"}|Aus:${s.employment_end || "-"}|UV:${s.vacation_days_contractual ?? "-"}|UG:${s.vacation_days_taken ?? "-"}|KT:${s.sick_days_total ?? "-"}`);
    });

    const dataContext = ctx.join("\n");

    const systemPrompt = `Du bist ein hilfreicher Assistent für ein Restaurant-Kassensystem. Du antwortest auf Deutsch.
Datenformat: Felder sind mit | getrennt. Geldbeträge in €.

Verfügbare Daten:
- Aggregierte Monatsdaten: gesamter Zeitraum (aus materialized view)
- Kellner-Details (TG, Performance, Provision): letzte 30 Tage
- Rohdaten: letzte 14 Tage

${dataContext}

Regeln:
- MONATSZUSAMMENFASSUNG enthält voraggregierte Summen. Nutze diese für Monats-Totale statt Rohdaten.
- PROVISION basiert auf Schwellenwert-System: nur Tage mit Ø-Umsatz ≥ Schwelle zählen. Pool wird nach ZT-Stunden verteilt.
- ARBEITSZEITEN: Abend=20-24h 25%, Nacht=24-4h 25%, TiefNacht=0-4h 40%.
- FEHLZEITEN zeigen exakte Von→Bis Bereiche.
- ZAHLUNGSARTEN für Bar/Karten-Fragen.
- KELLNER-PERF für €/h und Effizienz-Vergleiche.
- REST-VERGLEICH für Benchmarking. U=Umsatz, G=Gäste, U/G=Ø pro Gast, K%=Kartenanteil, KTG=KüchenTG, Aus=Ausgaben.
- ANOMALIEN proaktiv erwähnen bei allgemeinen Fragen.
- WETTER für Korrelationen (München). Wenn keine Daten, darauf hinweisen.
- Rohdaten nur 14 Tage. Für ältere Zeiträume → Monatsaggregationen.
- Nur Fragen zu diesem Kassensystem beantworten.
- Systemfunktionen: Tagesabrechnung, Kellner-Abrechnung, KüchenTG, Kassenstand, Ausgaben, Vorschüsse, Personal, Statistiken, Zeiterfassung, Provision.
- FEIERTAGE für Zuschläge und Terminplanung.
- Mitarbeiter-Kürzel: A=Aktiv, I=Inaktiv, MJ=Minijob, UV=Urlaubsanspruch, UG=Genommen, KT=Krankheitstage.
- ` + (() => {
  const now = new Date();
  const berlin = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const dow = berlin.getDay();
  const thisMonday = new Date(berlin); thisMonday.setDate(berlin.getDate() - ((dow + 6) % 7));
  const thisSunday = new Date(thisMonday); thisSunday.setDate(thisMonday.getDate() + 6);
  const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday); lastSunday.setDate(thisMonday.getDate() - 1);
  const thisMonth1 = new Date(berlin.getFullYear(), berlin.getMonth(), 1);
  const thisMonthEnd = new Date(berlin.getFullYear(), berlin.getMonth() + 1, 0);
  const lastMonth1 = new Date(berlin.getFullYear(), berlin.getMonth() - 1, 1);
  const lastMonthEnd = new Date(berlin.getFullYear(), berlin.getMonth(), 0);
  const yesterday = new Date(berlin); yesterday.setDate(berlin.getDate() - 1);
  const wday = berlin.toLocaleDateString("de-DE", { weekday: "long", timeZone: "Europe/Berlin" });
  return `Heute ist ${fmt(berlin)} (${wday}).
Zeiträume: "diese Woche"=${fmt(thisMonday)}→${fmt(thisSunday)}, "letzte Woche"=${fmt(lastMonday)}→${fmt(lastSunday)}, "dieser Monat"=${fmt(thisMonth1)}→${fmt(thisMonthEnd)}, "letzter Monat"=${fmt(lastMonth1)}→${fmt(lastMonthEnd)}, "gestern"=${fmt(yesterday)}.
Wochen=Mo→So. IMMER diese Datumsbereiche verwenden.`;
})();

    // Call Lovable AI Gateway
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
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: false,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit überschritten, bitte versuche es gleich nochmal." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Kontingent aufgebraucht." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `AI Fehler (${aiResponse.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ content: typeof content === "string" ? content : "Keine Antwort erhalten." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("restaurant-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
