export type SofortmeldungStatus =
  | 'entwurf'
  | 'unvollstaendig'
  | 'bereit'
  | 'erforderlich'
  | 'gemeldet'
  | 'fehler';

export interface Sofortmeldung {
  id: string;
  staff_id: string;
  status: SofortmeldungStatus;
  sofortmeldung_required: boolean;
  missing_fields: string[] | null;
  validated_at: string | null;
  exported_at: string | null;
  reported_at: string | null;
  error_message: string | null;
  export_format: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
}

export interface SofortmeldungLog {
  id: string;
  sofortmeldung_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  details: Record<string, unknown> | null;
  performed_by_name: string | null;
  created_at: string;
}

export interface SofortmeldungValidationResult {
  isComplete: boolean;
  missingFields: string[];
}

export const SOFORTMELDUNG_STATUS_CONFIG: Record<
  SofortmeldungStatus,
  { label: string; color: string; bgClass: string; textClass: string }
> = {
  entwurf: { label: 'Entwurf', color: 'gray', bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
  unvollstaendig: { label: 'Unvollständig', color: 'red', bgClass: 'bg-destructive/15', textClass: 'text-destructive' },
  bereit: { label: 'Bereit', color: 'green', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', textClass: 'text-emerald-700 dark:text-emerald-400' },
  erforderlich: { label: 'Erforderlich', color: 'amber', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-400' },
  gemeldet: { label: 'Gemeldet', color: 'blue', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-400' },
  fehler: { label: 'Fehler', color: 'red', bgClass: 'bg-destructive/15', textClass: 'text-destructive' },
};

/** Human-readable labels for missing fields */
export const FIELD_LABELS: Record<string, string> = {
  first_name: 'Vorname',
  last_name: 'Nachname',
  date_of_birth: 'Geburtsdatum',
  employment_start: 'Eintrittsdatum',
  health_insurance: 'Krankenkasse',
  nationality: 'Nationalität',
  address_street: 'Straße',
  address_zip: 'PLZ',
  address_city: 'Ort',
  work_start_time: 'Uhrzeit Arbeitsbeginn',
  employment_type: 'Beschäftigungsart',
  restaurant_assigned: 'Restaurant-Zuordnung',
};
