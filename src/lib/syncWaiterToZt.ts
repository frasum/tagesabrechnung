/**
 * Syncs a waiter cash-up submission to the Zeiterfassung (zt_shifts).
 * When a waiter submits their daily reconciliation, this creates/updates
 * a zt_shifts entry with start=16:00, end=submission time, department=Service.
 */
import { supabase } from '@/integrations/supabase/client';
import { calculateShiftHours } from '@/lib/shiftCalculations';
import { logSyncError } from '@/hooks/useSyncLogs';

interface SyncParams {
  waiterName: string;
  staffId?: string | null;
  additionalWaiters: string[];
  sessionDate: string;       // yyyy-MM-dd
  shiftStart: string;        // HH:mm
  shiftEnd: string;          // HH:mm
  restaurantId: string;
}

export interface SyncResult {
  synced: string[];
  failed: { name: string; reason: string }[];
}

async function findWeekForDate(date: string, restaurantId: string): Promise<string | null> {
  const { data } = await supabase
    .from('weeks')
    .select('id, scheduling_periods!inner(restaurant_id)')
    .eq('scheduling_periods.restaurant_id', restaurantId)
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

function staffMatchesName(staff: any, nameLower: string): boolean {
  if (staff?.name?.toLowerCase() === nameLower) return true;
  if (staff?.nickname?.toLowerCase() === nameLower) return true;
  if (staff?.first_name?.toLowerCase() === nameLower) return true;
  if (staff?.last_name?.toLowerCase() === nameLower) return true;
  // Match "Vorname Nachname" or "Nachname Vorname"
  if (staff?.first_name && staff?.last_name) {
    const fullA = `${staff.first_name} ${staff.last_name}`.toLowerCase();
    const fullB = `${staff.last_name} ${staff.first_name}`.toLowerCase();
    if (fullA === nameLower || fullB === nameLower) return true;
  }
  return false;
}

async function findStaffByName(name: string, restaurantId: string, department: 'Küche' | 'GL' | 'Service' = 'Service'): Promise<string | null> {
  const nameLower = name.toLowerCase().trim();

  // 1. Try exact department match
  const { data } = await supabase
    .from('staff_restaurants')
    .select('staff_id, staff!inner(id, name, first_name, last_name, nickname)')
    .eq('restaurant_id', restaurantId)
    .eq('zt_department', department);

  if (data) {
    const match = data.find((sr: any) => staffMatchesName(sr.staff, nameLower));
    if (match?.staff_id) return match.staff_id;
  }

  // 2. Fallback: search without department filter
  const { data: fallbackData } = await supabase
    .from('staff_restaurants')
    .select('staff_id, staff!inner(id, name, first_name, last_name, nickname)')
    .eq('restaurant_id', restaurantId);

  if (!fallbackData) return null;
  const fallbackMatch = fallbackData.find((sr: any) => staffMatchesName(sr.staff, nameLower));
  return fallbackMatch?.staff_id ?? null;
}

async function isHoliday(date: string): Promise<boolean> {
  const { data } = await supabase
    .from('bavarian_holidays')
    .select('id')
    .eq('holiday_date', date)
    .maybeSingle();
  return !!data;
}

async function upsertZtShift(params: {
  weekId: string;
  employeeId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  isSundayOrHoliday: boolean;
  isHoliday: boolean;
  department?: string;
}) {
  const dept = params.department ?? 'Service';

  // --- Conflict check: does a shift exist in another dept/week? ---
  const { data: allShiftsOnDay } = await supabase
    .from('zt_shifts')
    .select('id, department, week_id, start_time, absence_type, total_hours')
    .eq('employee_id', params.employeeId)
    .eq('shift_date', params.shiftDate);

  const hasConflict = allShiftsOnDay?.some(s =>
    s.week_id !== params.weekId &&
    (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0)
  );
  if (hasConflict) {
    const conflicting = allShiftsOnDay?.find(s => s.week_id !== params.weekId && (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0));
    console.warn(`Sync übersprungen: ${params.employeeId} hat am ${params.shiftDate} bereits eine Schicht in Abt. ${conflicting?.department}`);
    return;
  }

  const hours = calculateShiftHours(params.startTime, params.endTime, params.isSundayOrHoliday);

  const { error } = await supabase
    .from('zt_shifts')
    .upsert({
      week_id: params.weekId,
      employee_id: params.employeeId,
      shift_date: params.shiftDate,
      department: dept,
      start_time: params.startTime,
      end_time: params.endTime,
      total_hours: hours.totalHours,
      sunday_holiday_hours: hours.sundayHolidayHours,
      evening_hours: hours.eveningHours,
      night_hours: hours.nightHours,
      night_deep_hours: hours.nightDeepHours,
      is_holiday: params.isHoliday,
    }, {
      onConflict: 'employee_id,shift_date,department',
    });

  if (error) {
    console.error(`Failed to sync ${dept} shift to ZT:`, error);
  }
}

export async function syncWaiterShiftToZt(params: SyncParams): Promise<SyncResult> {
  const result: SyncResult = { synced: [], failed: [] };
  try {
    const weekId = await findWeekForDate(params.sessionDate, params.restaurantId);
    if (!weekId) {
      const reason = 'Keine passende Woche/Periode für dieses Datum gefunden';
      const allWaiters = [params.waiterName, ...params.additionalWaiters];
      for (const name of allWaiters) {
        result.failed.push({ name, reason });
        await logSyncError({ restaurantId: params.restaurantId, sessionDate: params.sessionDate, staffName: name, reason, source: 'waiter' });
      }
      return result;
    }

    let isSundayOrHoliday = false;
    let holidayFlag = false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.sessionDate)) {
      const dateObj = new Date(params.sessionDate + 'T12:00:00');
      if (!isNaN(dateObj.getTime())) {
        const isSunday = dateObj.getDay() === 0;
        holidayFlag = await isHoliday(params.sessionDate);
        isSundayOrHoliday = isSunday || holidayFlag;
      } else {
        console.warn(`Invalid session date (NaN): ${params.sessionDate}`);
      }
    } else {
      console.warn(`Invalid session date format: ${params.sessionDate}`);
    }

    const allWaiters = [params.waiterName, ...params.additionalWaiters];

    await Promise.all(allWaiters.map(async (name, index) => {
      // Use staff_id directly for the primary waiter if available
      let employeeId: string | null = null;
      if (index === 0 && params.staffId) {
        // Verify staff_id is assigned to this restaurant
        const { data: sr } = await supabase
          .from('staff_restaurants')
          .select('staff_id')
          .eq('staff_id', params.staffId)
          .eq('restaurant_id', params.restaurantId)
          .maybeSingle();
        employeeId = sr?.staff_id ?? null;
      }
      // Fallback to name matching
      if (!employeeId) {
        employeeId = await findStaffByName(name, params.restaurantId);
      }
      if (!employeeId) {
        const reason = 'Mitarbeiter nicht in der Personalverwaltung gefunden';
        result.failed.push({ name, reason });
        await logSyncError({ restaurantId: params.restaurantId, sessionDate: params.sessionDate, staffName: name, reason, source: 'waiter' });
        return;
      }

      await upsertZtShift({
        weekId,
        employeeId,
        shiftDate: params.sessionDate,
        startTime: params.shiftStart,
        endTime: params.shiftEnd,
        isSundayOrHoliday,
        isHoliday: holidayFlag,
      });
      result.synced.push(name);
    }));

    return result;
  } catch (err) {
    console.error('syncWaiterShiftToZt error:', err);
    return result;
  }
}

interface KitchenSyncParams {
  staffName: string;
  staffId?: string | null;
  sessionDate: string;
  shiftStart: string;
  shiftEnd: string;
  restaurantId: string;
}

export async function syncKitchenShiftToZt(params: KitchenSyncParams): Promise<SyncResult> {
  const result: SyncResult = { synced: [], failed: [] };
  try {
    const weekId = await findWeekForDate(params.sessionDate, params.restaurantId);
    if (!weekId) {
      const reason = 'Keine passende Woche/Periode für dieses Datum gefunden';
      result.failed.push({ name: params.staffName, reason });
      await logSyncError({ restaurantId: params.restaurantId, sessionDate: params.sessionDate, staffName: params.staffName, reason, source: 'kitchen' });
      return result;
    }

    let employeeId: string | null = null;
    if (params.staffId) {
      const { data: sr } = await supabase
        .from('staff_restaurants')
        .select('staff_id')
        .eq('staff_id', params.staffId)
        .eq('restaurant_id', params.restaurantId)
        .maybeSingle();
      employeeId = sr?.staff_id ?? null;
    }
    if (!employeeId) {
      employeeId = await findStaffByName(params.staffName, params.restaurantId, 'Küche');
    }
    if (!employeeId) {
      const reason = 'Mitarbeiter nicht in der Personalverwaltung gefunden';
      result.failed.push({ name: params.staffName, reason });
      await logSyncError({ restaurantId: params.restaurantId, sessionDate: params.sessionDate, staffName: params.staffName, reason, source: 'kitchen' });
      return result;
    }

    const dateObj = new Date(params.sessionDate + 'T12:00:00');
    const isSunday = dateObj.getDay() === 0;
    const holiday = await isHoliday(params.sessionDate);
    const isSundayOrHoliday = isSunday || holiday;

    await upsertZtShift({
      weekId,
      employeeId,
      shiftDate: params.sessionDate,
      startTime: params.shiftStart,
      endTime: params.shiftEnd,
      isSundayOrHoliday,
      isHoliday: holiday,
      department: 'Küche',
    });
    result.synced.push(params.staffName);
    return result;
  } catch (err) {
    console.error('syncKitchenShiftToZt error:', err);
    return result;
  }
}

export async function deleteKitchenShiftFromZt(params: {
  staffName: string;
  sessionDate: string;
  restaurantId: string;
}) {
  try {
    const employeeId = await findStaffByName(params.staffName, params.restaurantId, 'Küche');
    if (!employeeId) return;

    const { error } = await supabase
      .from('zt_shifts')
      .delete()
      .eq('employee_id', employeeId)
      .eq('shift_date', params.sessionDate)
      .eq('department', 'Küche');

    if (error) {
      console.error('Failed to delete kitchen shift from ZT:', error);
    }
  } catch (err) {
    console.error('deleteKitchenShiftFromZt error:', err);
  }
}
