/**
 * Syncs a waiter cash-up submission to the Zeiterfassung (zt_shifts).
 * When a waiter submits their daily reconciliation, this creates/updates
 * a zt_shifts entry with start=16:00, end=submission time, department=Service.
 */
import { supabase } from '@/integrations/supabase/client';
import { calculateShiftHours } from '@/lib/shiftCalculations';

interface SyncParams {
  waiterName: string;
  additionalWaiters: string[];
  sessionDate: string;       // yyyy-MM-dd
  shiftStart: string;        // HH:mm
  shiftEnd: string;          // HH:mm
  restaurantId: string;
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

async function findStaffByName(name: string, restaurantId: string, department: 'Küche' | 'GL' | 'Service' = 'Service'): Promise<string | null> {
  // 1. Try exact department match
  const { data } = await supabase
    .from('staff_restaurants')
    .select('staff_id, staff!inner(id, name)')
    .eq('restaurant_id', restaurantId)
    .eq('zt_department', department);

  if (data) {
    const match = data.find((sr: any) => sr.staff?.name === name);
    if (match?.staff_id) return match.staff_id;
  }

  // 2. Fallback: search without department filter (covers cases where zt_department is null/different)
  const { data: fallbackData } = await supabase
    .from('staff_restaurants')
    .select('staff_id, staff!inner(id, name)')
    .eq('restaurant_id', restaurantId);

  if (!fallbackData) return null;
  const fallbackMatch = fallbackData.find((sr: any) => sr.staff?.name === name);
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
  department?: string;
}) {
  const dept = params.department ?? 'Service';

  // --- Conflict check: does a shift exist in another dept/week? ---
  const { data: allShiftsOnDay } = await supabase
    .from('zt_shifts')
    .select('id, department, week_id')
    .eq('employee_id', params.employeeId)
    .eq('shift_date', params.shiftDate);

  const hasConflict = allShiftsOnDay?.some(s =>
    s.week_id !== params.weekId
  );
  if (hasConflict) {
    const conflicting = allShiftsOnDay?.find(s => s.week_id !== params.weekId);
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
      is_holiday: params.isSundayOrHoliday,
    }, {
      onConflict: 'employee_id,shift_date,department',
    });

  if (error) {
    console.error(`Failed to sync ${dept} shift to ZT:`, error);
  }
}

export async function syncWaiterShiftToZt(params: SyncParams) {
  try {
    const weekId = await findWeekForDate(params.sessionDate, params.restaurantId);
    if (!weekId) return;

    const dateObj = new Date(params.sessionDate + 'T12:00:00');
    const isSunday = dateObj.getDay() === 0;
    const holiday = await isHoliday(params.sessionDate);
    const isSundayOrHoliday = isSunday || holiday;

    const allWaiters = [params.waiterName, ...params.additionalWaiters];

    await Promise.all(allWaiters.map(async (name) => {
      const employeeId = await findStaffByName(name, params.restaurantId);
      if (!employeeId) return;

      await upsertZtShift({
        weekId,
        employeeId,
        shiftDate: params.sessionDate,
        startTime: params.shiftStart,
        endTime: params.shiftEnd,
        isSundayOrHoliday,
      });
    }));
  } catch (err) {
    console.error('syncWaiterShiftToZt error:', err);
  }
}

interface KitchenSyncParams {
  staffName: string;
  sessionDate: string;
  shiftStart: string;
  shiftEnd: string;
  restaurantId: string;
}

export async function syncKitchenShiftToZt(params: KitchenSyncParams) {
  try {
    const weekId = await findWeekForDate(params.sessionDate, params.restaurantId);
    if (!weekId) return;

    const employeeId = await findStaffByName(params.staffName, params.restaurantId, 'Küche');
    if (!employeeId) return;

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
      department: 'Küche',
    });
  } catch (err) {
    console.error('syncKitchenShiftToZt error:', err);
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
