/**
 * Berechnet das "Geschäftsdatum" für die Tagesabrechnung.
 * Der Geschäftstag endet erst um 3:00 Uhr nachts - alles zwischen 
 * 00:00 und 02:59 Uhr wird noch dem Vortag zugeordnet.
 * 
 * Beispiele:
 * - 07.02.2026 um 23:30 → Geschäftsdatum: 07.02.2026
 * - 08.02.2026 um 00:30 → Geschäftsdatum: 07.02.2026 (noch Vortag!)
 * - 08.02.2026 um 02:59 → Geschäftsdatum: 07.02.2026 (noch Vortag!)
 * - 08.02.2026 um 03:00 → Geschäftsdatum: 08.02.2026 (neuer Tag beginnt)
 */
export function getBusinessDate(referenceDate?: Date): Date {
  const now = referenceDate || new Date();
  const hour = now.getHours();
  
  // Vor 3 Uhr nachts = noch der vorherige Geschäftstag
  if (hour < 3) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  return now;
}

/**
 * Prüft ob ein gegebenes Datum dem aktuellen Geschäftstag entspricht.
 */
export function isBusinessToday(date: Date): boolean {
  const businessToday = getBusinessDate();
  const dateStr = date.toISOString().split('T')[0];
  const todayStr = businessToday.toISOString().split('T')[0];
  return dateStr === todayStr;
}

/**
 * Prüft ob eine Session gesperrt ist (älter als 3 Tage und kein Admin).
 * Admins können immer bearbeiten.
 */
export function isSessionLocked(sessionDate: Date, permissionLevel: 'staff' | 'manager' | 'admin'): boolean {
  if (permissionLevel === 'admin') return false;
  
  const today = getBusinessDate();
  const todayStr = today.toISOString().split('T')[0];
  const sessionStr = sessionDate.toISOString().split('T')[0];
  
  const todayMs = new Date(todayStr).getTime();
  const sessionMs = new Date(sessionStr).getTime();
  const diffDays = (todayMs - sessionMs) / (1000 * 60 * 60 * 24);
  
  return diffDays > 3;
}
