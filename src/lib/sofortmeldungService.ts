import type { Staff } from '@/hooks/useStaff';
import type { SofortmeldungValidationResult } from '@/types/sofortmeldung';

/** Required fields for a complete Sofortmeldung */
const REQUIRED_FIELDS: (keyof Staff | 'restaurant_assigned')[] = [
  'first_name',
  'last_name',
  'date_of_birth',
  'employment_start',
  'health_insurance',
  'nationality',
];

/** Additional fields on the staff record (new columns) */
const REQUIRED_EXTENDED_FIELDS = [
  'address_street',
  'address_zip',
  'address_city',
  'work_start_time',
  'employment_type',
] as const;

/**
 * Abstracted service for Sofortmeldung (§28a SGB IV).
 * Currently produces local exports; designed for later external API integration.
 */
export class SofortmeldungService {
  /**
   * Gastronomie is always subject to Sofortmeldung.
   */
  static checkRequired(): boolean {
    return true;
  }

  /**
   * Validate whether all required fields are filled.
   */
  static validate(staffData: Record<string, unknown>, hasRestaurant: boolean): SofortmeldungValidationResult {
    const missing: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      if (field === 'restaurant_assigned') continue;
      const val = staffData[field];
      if (!val || (typeof val === 'string' && !val.trim())) {
        missing.push(field);
      }
    }

    for (const field of REQUIRED_EXTENDED_FIELDS) {
      const val = staffData[field];
      if (!val || (typeof val === 'string' && !val.trim())) {
        missing.push(field);
      }
    }

    if (!hasRestaurant) {
      missing.push('restaurant_assigned');
    }

    return { isComplete: missing.length === 0, missingFields: missing };
  }

  /**
   * Export structured JSON for external systems.
   */
  static exportJSON(staffData: Record<string, unknown>): string {
    const payload = {
      meldungsart: 'Sofortmeldung',
      paragraph: '§28a SGB IV',
      branche: 'Gastronomie',
      zeitstempel: new Date().toISOString(),
      mitarbeiter: {
        vorname: staffData.first_name,
        nachname: staffData.last_name,
        geburtsdatum: staffData.date_of_birth,
        nationalitaet: staffData.nationality,
        adresse: {
          strasse: staffData.address_street,
          plz: staffData.address_zip,
          ort: staffData.address_city,
        },
        sozialversicherungsnr: staffData.social_security_nr || null,
        steuer_id: staffData.tax_id || null,
        krankenkasse: staffData.health_insurance,
        eintrittsdatum: staffData.employment_start,
        arbeitsbeginn: staffData.work_start_time,
        beschaeftigungsart: staffData.employment_type,
        minijob: staffData.is_minijob ?? false,
        taetigkeit: staffData.activity_description || null,
      },
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Export CSV row for external systems.
   */
  static exportCSV(staffData: Record<string, unknown>): string {
    const headers = [
      'Meldungsart', 'Vorname', 'Nachname', 'Geburtsdatum', 'Nationalität',
      'Straße', 'PLZ', 'Ort', 'SV-Nr', 'Steuer-ID', 'Krankenkasse',
      'Eintrittsdatum', 'Arbeitsbeginn', 'Beschäftigungsart', 'Minijob', 'Tätigkeit', 'Zeitstempel',
    ];
    const values = [
      'Sofortmeldung',
      staffData.first_name ?? '',
      staffData.last_name ?? '',
      staffData.date_of_birth ?? '',
      staffData.nationality ?? '',
      staffData.address_street ?? '',
      staffData.address_zip ?? '',
      staffData.address_city ?? '',
      staffData.social_security_nr ?? '',
      staffData.tax_id ?? '',
      staffData.health_insurance ?? '',
      staffData.employment_start ?? '',
      staffData.work_start_time ?? '',
      staffData.employment_type ?? '',
      staffData.is_minijob ? 'Ja' : 'Nein',
      staffData.activity_description ?? '',
      new Date().toISOString(),
    ];

    const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    return headers.map(escape).join(';') + '\n' + values.map(escape).join(';');
  }

  /**
   * Placeholder for future external API submission.
   */
  static async submit(_staffData: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    // In production, this would call an external API (e.g. ELSTER, ITSG, Steuerberater-API)
    console.log('[SofortmeldungService] submit() called — placeholder for external integration');
    return {
      success: false,
      message: 'Externe Schnittstelle noch nicht konfiguriert. Bitte Export verwenden.',
    };
  }
}
