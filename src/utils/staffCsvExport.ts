import { format, parseISO } from 'date-fns';
import type { Staff, StaffRole } from '@/hooks/useStaff';

const ROLE_LABELS: Record<StaffRole, string> = {
  waiter: 'Service',
  kitchen: 'Küche',
  both: 'Service + Küche',
  gl: 'Geschäftsleitung',
  waiter_gl: 'Service + GL',
  kitchen_gl: 'Küche + GL',
  all: 'Alle Rollen',
};

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str === '') return '';
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (value?: string | null): string => {
  if (!value) return '';
  try {
    return format(parseISO(value), 'dd.MM.yyyy');
  } catch {
    return value;
  }
};

const formatBool = (value?: boolean | null): string => {
  if (value === null || value === undefined) return '';
  return value ? 'Ja' : 'Nein';
};

const formatNumber = (value?: number | null): string => {
  if (value === null || value === undefined) return '';
  if (!Number.isFinite(value)) return '';
  return String(value).replace('.', ',');
};

const formatRestaurants = (staff: Staff): string => {
  const list = staff.staff_restaurants ?? [];
  if (list.length === 0) return '';
  return list
    .map((sr) => {
      const name = sr.restaurants?.name ?? '';
      const dept = sr.zt_department ? ` (${sr.zt_department})` : '';
      return `${name}${dept}`;
    })
    .filter(Boolean)
    .join(', ');
};

const COLUMNS: { header: string; get: (s: Staff) => string }[] = [
  { header: 'Personalnummer', get: (s) => (s.perso_nr ?? '').toString() },
  { header: 'Name', get: (s) => s.name ?? '' },
  { header: 'Vorname', get: (s) => s.first_name ?? '' },
  { header: 'Nachname', get: (s) => s.last_name ?? '' },
  { header: 'Spitzname', get: (s) => s.nickname ?? '' },
  { header: 'Geburtsdatum', get: (s) => formatDate(s.date_of_birth) },
  { header: 'Nationalität', get: (s) => s.nationality ?? '' },
  { header: 'Straße', get: (s) => s.address_street ?? '' },
  { header: 'PLZ', get: (s) => s.address_zip ?? '' },
  { header: 'Ort', get: (s) => s.address_city ?? '' },
  { header: 'Rolle', get: (s) => ROLE_LABELS[s.role] ?? s.role },
  { header: 'Berechtigung', get: (s) => s.permission_level ?? '' },
  { header: 'Tätigkeit', get: (s) => s.activity_description ?? '' },
  { header: 'Beschäftigungsart', get: (s) => s.employment_type ?? '' },
  { header: 'Eintritt', get: (s) => formatDate(s.employment_start) },
  { header: 'Austritt', get: (s) => formatDate(s.employment_end) },
  { header: 'Arbeitsbeginn', get: (s) => s.work_start_time ?? '' },
  { header: 'Aktiv', get: (s) => formatBool(s.is_active) },
  { header: 'Personengruppe', get: (s) => s.personnel_group ?? '' },
  { header: 'Stundenlohn', get: (s) => formatNumber(s.hourly_rate) },
  { header: 'Tip-Pool', get: (s) => formatBool(s.participates_in_pool) },
  { header: 'Steuerklasse', get: (s) => s.tax_class ?? '' },
  { header: 'Steuer-ID', get: (s) => s.tax_id ?? '' },
  { header: 'SV-Nummer', get: (s) => s.social_security_nr ?? '' },
  { header: 'Krankenkasse', get: (s) => s.health_insurance ?? '' },
  { header: 'Minijob', get: (s) => formatBool(s.is_minijob) },
  { header: 'SV-frei', get: (s) => formatBool(s.is_sv_exempt) },
  { header: 'Bank', get: (s) => s.bank_name ?? '' },
  { header: 'IBAN', get: (s) => s.iban ?? '' },
  { header: 'BIC', get: (s) => s.bic ?? '' },
  { header: 'Urlaub vertraglich', get: (s) => formatNumber(s.vacation_days_contractual) },
  { header: 'Urlaub Vorjahr', get: (s) => formatNumber(s.vacation_days_previous) },
  { header: 'Urlaub aktuell', get: (s) => formatNumber(s.vacation_days_current) },
  { header: 'Urlaub genommen', get: (s) => formatNumber(s.vacation_days_taken) },
  { header: 'Krankheitstage', get: (s) => formatNumber(s.sick_days_total) },
  { header: 'Restaurants', get: (s) => formatRestaurants(s) },
  { header: 'Notizen', get: (s) => s.notes ?? '' },
  { header: 'Erstellt am', get: (s) => formatDate(s.created_at) },
];

export function exportStaffToCsv(staff: Staff[]): void {
  const headerRow = COLUMNS.map((c) => escapeCsv(c.header)).join(';');
  const dataRows = staff.map((s) =>
    COLUMNS.map((c) => escapeCsv(c.get(s))).join(';')
  );
  const csv = [headerRow, ...dataRows].join('\r\n');

  // UTF-8 BOM for German Excel compatibility
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const fileName = `Mitarbeiter_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Fallback for sandboxed iframes (Lovable preview) that block downloads:
  // open in new tab so the user can save manually
  setTimeout(() => {
    try {
      const w = window.open(url, '_blank');
      if (!w) {
        // Popup blocked — last resort: navigate top window
        window.location.href = url;
      }
    } catch {
      /* ignore */
    }
  }, 100);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
