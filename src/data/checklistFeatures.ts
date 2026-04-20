export interface ChecklistFeature {
  key: string;
  label: string;
}

export interface ChecklistCategory {
  key: string;
  label: string;
  features: ChecklistFeature[];
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    key: 'auth',
    label: 'Authentifizierung & Sicherheit',
    features: [
      { key: 'pin_login', label: 'PIN-Login (4-stellig)' },
      { key: 'oauth_google', label: 'Google OAuth' },
      { key: 'oauth_apple', label: 'Apple OAuth' },
      { key: 'webauthn', label: 'WebAuthn / Biometrie' },
      { key: 'session_lock', label: 'Session-Lock (30 Min Inaktivität)' },
      { key: 'rbac', label: 'RBAC (staff / manager / admin)' },
      { key: 'audit_log', label: 'Audit-Log' },
      { key: 'login_confirmation', label: 'Login-Bestätigung (2FA)' },
    ],
  },
  {
    key: 'waiter',
    label: 'Kellner-Abrechnung',
    features: [
      { key: 'pwa', label: 'Mobile PWA' },
      { key: 'bartender_mode', label: 'Barmann-Modus' },
      { key: 'tip_pool', label: 'Trinkgeld-Pool' },
      { key: 'self_service', label: 'Self-Service (Mitarbeiter)' },
      { key: 'second_waiter', label: 'Zweitkellner' },
      { key: 'team_waiter', label: 'Team-Abrechnung' },
      { key: 'sofortmeldung_banner', label: 'Sofortmeldung-Banner' },
    ],
  },
  {
    key: 'cash',
    label: 'Tagesabrechnung & Bargeld',
    features: [
      { key: 'cash_balance', label: 'Bargeldbestand' },
      { key: 'carry_over', label: 'Carry-Over Berechnung' },
      { key: 'bank_deposits', label: 'Bankeinzahlungen' },
      { key: 'register_transfers', label: 'Tresor-Transfers' },
      { key: 'advances', label: 'Vorschüsse' },
      { key: 'kitchen_tip', label: 'Küchen-Trinkgeld' },
      { key: 'expenses', label: 'Ausgaben' },
      { key: 'session_unlock', label: 'Session-Entsperrung' },
    ],
  },
  {
    key: 'statistics',
    label: 'Statistiken',
    features: [
      { key: 'tip_ranking', label: 'Trinkgeld-Ranking' },
      { key: 'monthly_breakdown', label: 'Monatsauswertung' },
      { key: 'tip_per_hour', label: 'TG / Stunde' },
      { key: 'restaurant_compare', label: 'Restaurant-Vergleich' },
      { key: 'delivery_breakdown', label: 'Lieferplattformen-Aufschlüsselung' },
      { key: 'period_comparison', label: 'Perioden-Vergleich' },
    ],
  },
  {
    key: 'zeiterfassung',
    label: 'Zeiterfassung',
    features: [
      { key: 'wochenplan', label: 'Wochenplan' },
      { key: 'zusammenfassung', label: 'Zusammenfassung' },
      { key: 'buchhaltung', label: 'Buchhaltung' },
      { key: 'brutto_netto', label: 'Brutto / Netto' },
      { key: 'provision', label: 'Provision' },
      { key: 'sfn_modes', label: 'SFN-Modi (einfach / §3b)' },
      { key: 'lohnportal', label: 'Lohnbüro-Portal' },
      { key: 'sharing_link', label: 'Sharing-Link' },
      { key: 'batch_payroll', label: 'Batch-Lohnberechnung' },
      { key: 'payroll_pdf_ocr', label: 'Lohnabrechnung PDF-OCR' },
    ],
  },
  {
    key: 'dienstplan',
    label: 'Dienstplan',
    features: [
      { key: 'service_plan', label: 'Service-Plan' },
      { key: 'kueche_plan', label: 'Küchen-Plan' },
      { key: 'skills', label: 'Skills-System' },
      { key: 'conflict_check', label: 'Konfliktprüfung' },
      { key: 'thaitime_sync', label: 'Thaitime-Sync' },
      { key: 'monthly_period', label: 'Monatsperiode (26.–25.)' },
      { key: 'absence_management', label: 'Abwesenheits-Verwaltung' },
    ],
  },
  {
    key: 'sofortmeldung',
    label: 'Sofortmeldung',
    features: [
      { key: 'pdf_export', label: 'PDF-Export §28a SGB IV' },
      { key: 'workflow', label: 'Workflow & Status' },
      { key: 'validation', label: 'Pflichtfeld-Validierung' },
    ],
  },
  {
    key: 'telegram',
    label: 'Telegram & Benachrichtigungen',
    features: [
      { key: 'daily_reports', label: 'Tagesberichte' },
      { key: 'pdf_notification', label: 'PDF-Export-Benachrichtigung' },
      { key: 'schedule', label: 'Zeitplan / Cron' },
      { key: 'detail_settings', label: 'Detail-Einstellungen' },
    ],
  },
  {
    key: 'verwaltung',
    label: 'Verwaltung',
    features: [
      { key: 'staff_management', label: 'Mitarbeiter-Verwaltung' },
      { key: 'soft_delete', label: 'Soft-Delete' },
      { key: 'skill_colors', label: 'Skill-Farben' },
      { key: 'permissions', label: 'Berechtigungen (Manager)' },
      { key: 'restaurant_settings', label: 'Restaurant-Einstellungen' },
    ],
  },
  {
    key: 'pwa',
    label: 'PWA & Updates',
    features: [
      { key: 'service_worker', label: 'Service Worker' },
      { key: 'manual_update', label: 'Manueller Update-Button' },
      { key: 'mobile_layout', label: 'Mobile Layout' },
      { key: 'install_page', label: 'Installations-Seite' },
    ],
  },
  {
    key: 'ai',
    label: 'AI-Features',
    features: [
      { key: 'restaurant_chat', label: 'Restaurant-Chat' },
      { key: 'voice_assistant', label: 'Voice-Assistent (ElevenLabs)' },
      { key: 'payroll_ocr', label: 'Lohn-PDF OCR (Gemini)' },
    ],
  },
];

export const EDGE_FUNCTIONS_CATEGORY = 'edge_functions';
