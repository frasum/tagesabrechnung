export interface EmployeeWithDepartment {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  perso_nr: number;
  department: string;
}

export interface EmployeeTotals {
  gesamt: number;
  soFei: number;
  evening: number;
  night: number;
  schichten: number;
  urlaubTage: number;
  krankTage: number;
}

export interface Shift {
  employee_id: string;
  total_hours: number;
  sunday_holiday_hours: number;
  evening_hours: number;
  night_hours: number;
  start_time: string | null;
  end_time: string | null;
  absence_type: string | null;
  shift_date: string;
  department?: string;
}

export interface PayrollNote {
  id: string;
  employee_id: string;
  period_id: string;
  vorschuss: number;
  besonderheiten: string | null;
}
