/**
 * Core shift hour calculation logic.
 * Handles midnight crossover, evening/night splits, and Sunday/holiday detection.
 */

export interface ShiftHours {
  totalHours: number;
  sundayHolidayHours: number;
  eveningHours: number;      // 20:00–24:00
  nightHours: number;        // 00:00–end (after midnight, total)
  nightDeepHours: number;    // 00:00–04:00 (40% surcharge per §3b EStG)
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlapMinutes(
  shiftStart: number,
  shiftEnd: number,
  rangeStart: number,
  rangeEnd: number
): number {
  const start = Math.max(shiftStart, rangeStart);
  const end = Math.min(shiftEnd, rangeEnd);
  return Math.max(0, end - start);
}

export function calculateShiftHours(
  startTime: string | null,
  endTime: string | null,
  isSundayOrHoliday: boolean
): ShiftHours {
  if (!startTime || !endTime) {
    return { totalHours: 0, sundayHolidayHours: 0, eveningHours: 0, nightHours: 0, nightDeepHours: 0 };
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  let totalMinutes: number;
  if (endMin > startMin) {
    totalMinutes = endMin - startMin;
  } else {
    totalMinutes = (1440 - startMin) + endMin;
  }

  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  let eveningMinutes = 0;
  let nightMinutes = 0;
  let nightDeepMinutes = 0;

  if (endMin > startMin) {
    // Shift does NOT cross midnight
    eveningMinutes = overlapMinutes(startMin, endMin, 1200, 1440);
    // No night hours possible (shift ends before midnight)
  } else {
    // Shift crosses midnight
    eveningMinutes = overlapMinutes(startMin, 1440, 1200, 1440);
    nightMinutes = endMin; // 00:00 to endMin
    // Deep night: 00:00–04:00 (240 min)
    nightDeepMinutes = Math.min(endMin, 240);
  }

  const eveningHours = Math.round((eveningMinutes / 60) * 100) / 100;
  const nightHours = Math.round((nightMinutes / 60) * 100) / 100;
  const nightDeepHours = Math.round((nightDeepMinutes / 60) * 100) / 100;
  const sundayHolidayHours = isSundayOrHoliday ? totalHours : 0;

  return { totalHours, sundayHolidayHours, eveningHours, nightHours, nightDeepHours };
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export function formatHours(hours: number): string {
  return hours.toFixed(2).replace(".", ",");
}

/**
 * Effective evening/night hours excluding Sunday/holiday overlap.
 * When a shift falls on a Sunday or holiday, its evening (20-24) and night (24-x) hours
 * are NOT counted separately because the higher So/Fei surcharge already applies.
 *
 * In additive mode (§3b extended), night surcharges STACK with So/Fei surcharges,
 * so we return the full values regardless.
 */
export function effectiveEveningHours(
  shift: { evening_hours: number; sunday_holiday_hours: number },
  additive = false
): number {
  if (additive) return Number(shift.evening_hours);
  return Number(shift.sunday_holiday_hours) > 0 ? 0 : Number(shift.evening_hours);
}

export function effectiveNightHours(
  shift: { night_hours: number; sunday_holiday_hours: number },
  additive = false
): number {
  if (additive) return Number(shift.night_hours);
  return Number(shift.sunday_holiday_hours) > 0 ? 0 : Number(shift.night_hours);
}

export const DEPARTMENT_ORDER = ["Küche", "GL", "Service"] as const;

export function countVacationDays(
  shifts: { absence_type?: string | null; week_id?: string; start_time?: string | null; end_time?: string | null }[]
): number {
  const byWeek: Record<string, typeof shifts> = {};
  for (const s of shifts) {
    const wk = s.week_id ?? "unknown";
    (byWeek[wk] ??= []).push(s);
  }

  let total = 0;
  for (const weekShifts of Object.values(byWeek)) {
    const vacDays = weekShifts.filter(s => s.absence_type === 'urlaub').length;
    const workDays = weekShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length;
    const freeDays = 7 - workDays - vacDays;
    const overlap = Math.max(0, 2 - freeDays);
    total += Math.max(0, vacDays - overlap);
  }
  return Math.round(total * 100) / 100;
}

export function countSickDays(shifts: { absence_type?: string | null }[]): number {
  return shifts.filter(s => s.absence_type === 'krank').length;
}

/**
 * Get sick date ranges from shifts grouped into consecutive day ranges.
 */
export function getAbsenceDateRanges(
  shifts: { absence_type?: string | null; shift_date?: string }[],
  type: string
): { from: string; to: string }[] {
  const dates = shifts
    .filter(s => s.absence_type === type && s.shift_date)
    .map(s => s.shift_date!)
    .sort();

  if (!dates.length) return [];

  const ranges: { from: string; to: string }[] = [];
  let from = dates[0];
  let prev = dates[0];

  for (let i = 1; i < dates.length; i++) {
    const curr = dates[i];
    const prevDate = new Date(prev);
    const currDate = new Date(curr);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) {
      prev = curr;
    } else {
      ranges.push({ from, to: prev });
      from = curr;
      prev = curr;
    }
  }
  ranges.push({ from, to: prev });
  return ranges;
}

/** Backward-compatible wrapper */
export function getSickDateRanges(
  shifts: { absence_type?: string | null; shift_date?: string }[]
): { from: string; to: string }[] {
  return getAbsenceDateRanges(shifts, 'krank');
}

export function getVacationDateRanges(
  shifts: { absence_type?: string | null; shift_date?: string }[]
): { from: string; to: string }[] {
  return getAbsenceDateRanges(shifts, 'urlaub');
}

/**
 * Format sick date ranges for display.
 * E.g. "25.02." or "25.02.–28.02. (4T)"
 */
export function formatSickRanges(ranges: { from: string; to: string }[]): string[] {
  return ranges.map(r => {
    const fromDate = new Date(r.from);
    const toDate = new Date(r.to);
    const fmtDay = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
    if (r.from === r.to) return fmtDay(fromDate);
    const days = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${fmtDay(fromDate)}–${fmtDay(toDate)} (${days}T)`;
  });
}

/**
 * Format vacation date ranges using actual shift count instead of calendar days.
 */
export function formatVacationRanges(
  ranges: { from: string; to: string }[],
  shifts: { absence_type?: string | null; shift_date?: string }[]
): string[] {
  const fmtDay = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  return ranges.map(r => {
    const fromDate = new Date(r.from);
    const toDate = new Date(r.to);
    if (r.from === r.to) return fmtDay(fromDate);
    const actualDays = shifts.filter(
      s => s.absence_type === 'urlaub' && s.shift_date && s.shift_date >= r.from && s.shift_date <= r.to
    ).length;
    return `${fmtDay(fromDate)}–${fmtDay(toDate)} (${actualDays}T)`;
  });
}

export function getDepartmentColorClass(dept: string): string {
  switch (dept) {
    case "Küche": return "dept-kueche";
    case "GL": return "dept-gl";
    case "Service": return "dept-service";
    default: return "";
  }
}

export function getDepartmentBgClass(dept: string): string {
  switch (dept) {
    case "Küche": return "dept-kueche-light";
    case "GL": return "dept-gl-light";
    case "Service": return "dept-service-light";
    default: return "";
  }
}
