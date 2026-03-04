export interface EmployeeTotals {
  gesamt: number;
  sonntagStunden: number;
  feiertagStunden: number;
  evening: number;
  night: number;
  schichten: number;
  urlaubTage: number;
  krankTage: number;
}

export interface Shift {
  employee_id: string;
  week_id: string;
  total_hours: number;
  sunday_holiday_hours: number;
  is_holiday: boolean;
  evening_hours: number;
  night_hours: number;
  start_time: string | null;
  end_time: string | null;
  absence_type: string | null;
  shift_date: string;
  department?: string | null;
}

export interface PayrollNote {
  id: string;
  employee_id: string;
  period_id: string;
  vorschuss: number;
  urlaub_tage: number;
  besonderheiten: string | null;
}

export interface AdvanceEntry {
  staff_name: string;
  amount: number;
  date: string;
}
