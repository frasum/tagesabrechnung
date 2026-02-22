export type PermissionLevel = 'staff' | 'manager' | 'admin';

export interface PermissionConfig {
  label: string;
  description: string;
  minLevel: PermissionLevel;
}

// Navigation items with required permission levels
export const NAV_PERMISSIONS: Record<string, PermissionConfig> = {
  '': { label: 'Mitarbeiter Abrechnung', description: 'Abrechnungen einsehen', minLevel: 'staff' },
  'manager': { label: 'Manager Dashboard', description: 'Dashboard verwalten', minLevel: 'manager' },
  'kitchen': { label: 'Küchen Trinkgeld', description: 'Küchen-Trinkgeld verteilen', minLevel: 'manager' },
  'summary': { label: 'Tagesabrechnung', description: 'Tagesabschluss durchführen', minLevel: 'manager' },
  'statistics': { label: 'Statistiken', description: 'Statistiken einsehen', minLevel: 'manager' },
  'history': { label: 'Verlauf', description: 'Vergangene Abrechnungen', minLevel: 'manager' },
  'cash-balance': { label: 'Bargeldbestand', description: 'Bargeld verwalten', minLevel: 'manager' },
  
  'qr-poster': { label: 'QR-Poster', description: 'Mitarbeiter Self-Service Poster', minLevel: 'manager' },
  'staff': { label: 'Mitarbeiter', description: 'Mitarbeiter verwalten', minLevel: 'admin' },
  'permissions': { label: 'Berechtigungen', description: 'Navigationszugriff verwalten', minLevel: 'admin' },
};

// Manager-configurable navigation items (excludes staff-only and admin-only)
export const MANAGER_NAV_ITEMS = [
  { path: '', label: 'Mitarbeiterabrechnung' },
  { path: 'kitchen', label: 'Küchen Trinkgeld' },
  { path: 'summary', label: 'Tagesabrechnung' },
  { path: 'statistics', label: 'Statistiken' },
  { path: 'history', label: 'Verlauf' },
  { path: 'cash-balance', label: 'Bargeldbestand' },
  
  { path: 'qr-poster', label: 'QR-Poster' },
];

// Permission level hierarchy (higher index = more permissions)
const PERMISSION_HIERARCHY: PermissionLevel[] = ['staff', 'manager', 'admin'];

/**
 * Check if a user's permission level meets the required minimum level
 */
export function hasPermission(userLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
  const userIndex = PERMISSION_HIERARCHY.indexOf(userLevel);
  const requiredIndex = PERMISSION_HIERARCHY.indexOf(requiredLevel);
  return userIndex >= requiredIndex;
}

/**
 * Get all navigation paths accessible to a given permission level
 */
export function getAccessiblePaths(level: PermissionLevel): string[] {
  return Object.entries(NAV_PERMISSIONS)
    .filter(([_, config]) => hasPermission(level, config.minLevel))
    .map(([path]) => path);
}

/**
 * Permission level display info
 */
export const PERMISSION_LEVEL_INFO: Record<PermissionLevel, { label: string; description: string }> = {
  staff: {
    label: 'Mitarbeiter',
    description: 'Nur eigene Abrechnung einsehen',
  },
  manager: {
    label: 'Manager',
    description: 'Dashboard, Statistiken, Trinkgeld-Verteilung',
  },
  admin: {
    label: 'Admin',
    description: 'Vollzugriff inkl. Mitarbeiterverwaltung',
  },
};
