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

async function findWeekForDate(date: string): Promise<string | null> {
  const { data } = await supabase
    .from('weeks')
    .select('id')
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function findStaffByName(name: string, restaurantId: string): Promise<string | null> {
  // Match by staff.name via staff_restaurants for the given restaurant
  const { data } = await supabase
    .from('staff_restaurants')
    .select('staff_id, staff!inner(id, name)')
    .eq('restaurant_id', restaurantId)
    .eq('zt_department', 'Service');

  if (!data) return null;
  const match = data.find((sr: any) => sr.staff?.name === name);
  return match?.staff_id ?? null;
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
}) {
  const hours = calculateShiftHours(params.startTime, params.endTime, params.isSundayOrHoliday);

  const { error } = await supabase
    .from('zt_shifts')
    .upsert({
      week_id: params.weekId,
      employee_id: params.employeeId,
      shift_date: params.shiftDate,
      department: 'Service',
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
    console.error('Failed to sync waiter shift to ZT:', error);
  }
}

export async function syncWaiterShiftToZt(params: SyncParams) {
  try {
    const weekId = await findWeekForDate(params.sessionDate);
    if (!weekId) return; // No matching period/week — skip silently

    const dateObj = new Date(params.sessionDate + 'T12:00:00');
    const isSunday = dateObj.getDay() === 0;
    const holiday = await isHoliday(params.sessionDate);
    const isSundayOrHoliday = isSunday || holiday;

    // Sync all waiters: primary + additional
    const allWaiters = [params.waiterName, ...params.additionalWaiters];

    await Promise.all(allWaiters.map(async (name) => {
      const employeeId = await findStaffByName(name, params.restaurantId);
      if (!employeeId) return; // Staff not found in ZT — skip

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
    // Don't fail the main mutation — just log
    console.error('syncWaiterShiftToZt error:', err);
  }
}
