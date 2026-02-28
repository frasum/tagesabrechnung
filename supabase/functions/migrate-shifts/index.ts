import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Source project (Zeiterfassung)
const SOURCE_URL = "https://uahvcjqufmnsmnnoydsa.supabase.co";
const SOURCE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhaHZjanF1Zm1uc21ubm95ZHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjUyMDcsImV4cCI6MjA4NzYwMTIwN30.ktKTQewjL3BXAgh7d-_pYphgjOSTIz-9EADTolv1Ncg";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const source = createClient(SOURCE_URL, SOURCE_KEY);
    const targetUrl = Deno.env.get("SUPABASE_URL")!;
    const targetKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const target = createClient(targetUrl, targetKey);

    // 1. Read source data
    const [employeesRes, employeeRestRes, shiftsRes, periodsRes, weeksRes, restaurantsRes, payrollRes] = await Promise.all([
      source.from("employees").select("*"),
      source.from("employee_restaurants").select("*"),
      source.from("shifts").select("*"),
      source.from("scheduling_periods").select("*"),
      source.from("weeks").select("*"),
      source.from("restaurants").select("*"),
      source.from("payroll_notes").select("*"),
    ]);

    const srcEmployees = employeesRes.data || [];
    const srcEmpRest = employeeRestRes.data || [];
    const srcShifts = shiftsRes.data || [];
    const srcPeriods = periodsRes.data || [];
    const srcWeeks = weeksRes.data || [];
    const srcRestaurants = restaurantsRes.data || [];
    const srcPayroll = payrollRes.data || [];

    // 2. Read target data
    const [staffRes, targetPeriodsRes, targetWeeksRes, targetRestRes, targetStaffRestRes] = await Promise.all([
      target.from("staff").select("id, name, first_name, last_name, nickname, perso_nr"),
      target.from("scheduling_periods").select("*"),
      target.from("weeks").select("*"),
      target.from("restaurants").select("id, name, slug"),
      target.from("staff_restaurants").select("*"),
    ]);

    const targetStaff = staffRes.data || [];
    const targetPeriods = targetPeriodsRes.data || [];
    const targetWeeks = targetWeeksRes.data || [];
    const targetRestaurants = targetRestRes.data || [];
    const targetStaffRest = targetStaffRestRes.data || [];

    // 3. Build restaurant mapping: source restaurant name → target restaurant id
    const srcRestMap: Record<string, string> = {}; // source restaurant id → name
    for (const r of srcRestaurants) {
      srcRestMap[r.id] = r.name;
    }

    const targetRestByName: Record<string, string> = {}; // restaurant name → target id
    for (const r of targetRestaurants) {
      targetRestByName[r.name] = r.id;
    }

    // 4. Build employee → staff mapping using perso_nr or nickname match
    const employeeToStaffId: Record<string, string> = {};
    const unmappedEmployees: string[] = [];

    for (const emp of srcEmployees) {
      // Try matching by perso_nr first
      let match = targetStaff.find(s => s.perso_nr && s.perso_nr === emp.perso_nr);
      
      // Try matching by nickname
      if (!match) {
        match = targetStaff.find(s => 
          s.nickname && emp.nickname && s.nickname.toLowerCase() === emp.nickname.toLowerCase()
        );
      }
      
      // Try matching by name (first_name or nickname in source → name in target)
      if (!match) {
        match = targetStaff.find(s => 
          s.name.toLowerCase() === (emp.nickname || emp.first_name).toLowerCase()
        );
      }

      if (match) {
        employeeToStaffId[emp.id] = match.id;
      } else {
        unmappedEmployees.push(`${emp.first_name} ${emp.last_name} (${emp.nickname}, perso_nr: ${emp.perso_nr})`);
      }
    }

    // 5. Build week mapping: source week → target week (by matching period dates + week_number)
    // First map periods: source period → target period by start_date + end_date + restaurant
    const srcPeriodToTarget: Record<string, string> = {};
    
    for (const sp of srcPeriods) {
      const srcRestName = sp.restaurant_id ? srcRestMap[sp.restaurant_id] : null;
      const targetRestId = srcRestName ? targetRestByName[srcRestName] : null;
      
      const match = targetPeriods.find(tp => 
        tp.start_date === sp.start_date && 
        tp.end_date === sp.end_date &&
        (!targetRestId || tp.restaurant_id === targetRestId)
      );
      
      if (match) {
        srcPeriodToTarget[sp.id] = match.id;
      }
    }

    // Map weeks
    const srcWeekToTarget: Record<string, string> = {};
    for (const sw of srcWeeks) {
      const targetPeriodId = srcPeriodToTarget[sw.period_id];
      if (!targetPeriodId) continue;
      
      const match = targetWeeks.find(tw => 
        tw.period_id === targetPeriodId && 
        tw.week_number === sw.week_number
      );
      
      if (match) {
        srcWeekToTarget[sw.id] = match.id;
      }
    }

    // 6. Map and insert employee_restaurants → staff_restaurants (zt_department + zt_hourly_rate)
    const staffRestUpdates: any[] = [];
    for (const er of srcEmpRest) {
      const staffId = employeeToStaffId[er.employee_id];
      const srcRestName = srcRestMap[er.restaurant_id];
      const targetRestId = srcRestName ? targetRestByName[srcRestName] : null;
      
      if (!staffId || !targetRestId) continue;

      // Check if staff_restaurants entry already exists
      const existing = targetStaffRest.find(sr => 
        sr.staff_id === staffId && sr.restaurant_id === targetRestId
      );

      if (existing) {
        // Update existing with zt_department and zt_hourly_rate
        if (!existing.zt_department) {
          staffRestUpdates.push({
            id: existing.id,
            staff_id: staffId,
            restaurant_id: targetRestId,
            zt_department: er.department,
            zt_hourly_rate: er.hourly_rate,
          });
        }
      } else {
        // Insert new
        staffRestUpdates.push({
          staff_id: staffId,
          restaurant_id: targetRestId,
          zt_department: er.department,
          zt_hourly_rate: er.hourly_rate,
        });
      }
    }

    // Upsert staff_restaurants
    let staffRestInserted = 0;
    if (staffRestUpdates.length > 0) {
      const { error: srError } = await target
        .from("staff_restaurants")
        .upsert(staffRestUpdates, { onConflict: "id" });
      if (srError) {
        console.error("staff_restaurants upsert error:", srError);
      } else {
        staffRestInserted = staffRestUpdates.length;
      }
    }

    // 7. Map and insert shifts → zt_shifts
    const ztShifts: any[] = [];
    const unmappedShifts: string[] = [];

    for (const shift of srcShifts) {
      const staffId = employeeToStaffId[shift.employee_id];
      const targetWeekId = srcWeekToTarget[shift.week_id];

      if (!staffId || !targetWeekId) {
        if (!staffId) {
          const emp = srcEmployees.find(e => e.id === shift.employee_id);
          unmappedShifts.push(`No staff match for employee ${emp?.nickname || emp?.first_name} on ${shift.shift_date}`);
        } else {
          unmappedShifts.push(`No week match for week_id ${shift.week_id} on ${shift.shift_date}`);
        }
        continue;
      }

      ztShifts.push({
        week_id: targetWeekId,
        employee_id: staffId,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        total_hours: shift.total_hours,
        evening_hours: shift.evening_hours,
        night_hours: shift.night_hours,
        sunday_holiday_hours: shift.sunday_holiday_hours,
        is_holiday: shift.is_holiday,
        absence_type: shift.absence_type,
        department: shift.department,
      });
    }

    // Delete existing zt_shifts first to avoid duplicates
    const targetWeekIds = [...new Set(ztShifts.map(s => s.week_id))];
    for (const wid of targetWeekIds) {
      await target.from("zt_shifts").delete().eq("week_id", wid);
    }

    // Insert in batches of 500
    let shiftsInserted = 0;
    for (let i = 0; i < ztShifts.length; i += 500) {
      const batch = ztShifts.slice(i, i + 500);
      const { error } = await target.from("zt_shifts").insert(batch);
      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
        return new Response(JSON.stringify({ 
          error: `Failed at batch ${i}: ${error.message}`,
          shiftsInserted,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      shiftsInserted += batch.length;
    }

    // 8. Migrate payroll_notes
    let payrollInserted = 0;
    const payrollToInsert: any[] = [];
    for (const pn of srcPayroll) {
      const staffId = employeeToStaffId[pn.employee_id];
      const targetPeriodId = srcPeriodToTarget[pn.period_id];
      if (!staffId || !targetPeriodId) continue;
      
      payrollToInsert.push({
        period_id: targetPeriodId,
        employee_id: staffId,
        vorschuss: pn.vorschuss,
        urlaub_tage: pn.urlaub_tage,
        besonderheiten: pn.besonderheiten,
      });
    }

    if (payrollToInsert.length > 0) {
      // Delete existing payroll_notes for these periods first
      const periodIds = [...new Set(payrollToInsert.map(p => p.period_id))];
      for (const pid of periodIds) {
        await target.from("payroll_notes").delete().eq("period_id", pid);
      }
      
      const { error: pnError } = await target.from("payroll_notes").insert(payrollToInsert);
      if (pnError) {
        console.error("payroll_notes insert error:", pnError);
      } else {
        payrollInserted = payrollToInsert.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        sourceEmployees: srcEmployees.length,
        mappedEmployees: Object.keys(employeeToStaffId).length,
        unmappedEmployees,
        sourceShifts: srcShifts.length,
        shiftsInserted,
        unmappedShifts: unmappedShifts.slice(0, 20),
        staffRestInserted,
        payrollInserted,
        periodsMapped: Object.keys(srcPeriodToTarget).length,
        weeksMapped: Object.keys(srcWeekToTarget).length,
      }
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("Migration error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
