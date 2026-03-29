import { format } from 'date-fns';

/**
 * Berechnet das "Geschäftsdatum" für die Tagesabrechnung.
 * Der Geschäftstag endet erst um 3:00 Uhr nachts - alles zwischen 
 * 00:00 und 02:59 Uhr wird noch dem Vortag zugeordnet.
 */
export function getBusinessDate(referenceDate?: Date): Date {
  const now = referenceDate || new Date();
  const hour = now.getHours();
  
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
  const dateStr = format(date, 'yyyy-MM-dd');
  const todayStr = format(businessToday, 'yyyy-MM-dd');
  return dateStr === todayStr;
}

/**
 * Prüft ob eine Session gesperrt ist.
 * Gesperrt wenn: Datum liegt vor dem heutigen Geschäftstag UND nicht manuell entsperrt.
 * Gilt für ALLE Rollen gleichermaßen (staff, manager, admin).
 * Admin und Manager können den Schreibschutz manuell aufheben.
 */
export function isSessionLocked(sessionDate: Date, isUnlocked: boolean = false): boolean {
  if (isUnlocked) return false;
  
  const today = getBusinessDate();
  const todayStr = format(today, 'yyyy-MM-dd');
  const sessionStr = format(sessionDate, 'yyyy-MM-dd');
  
  return sessionStr < todayStr;
}
