/**
 * Shared utilities for counting service staff including
 * second_waiter_name and additional_waiters from waiter_shifts.
 *
 * These helpers ensure consistent handling of team shifts
 * across the entire application (Provision, Statistics, DailySummary, etc.).
 */

export interface WaiterShiftTeamInfo {
  waiter_name: string;
  second_waiter_name?: string | null;
  additional_waiters?: string[];
  participates_in_pool?: boolean;
}

/**
 * Returns all team member names for a waiter shift,
 * including primary, second, and additional waiters.
 */
export function getAllTeamMembers(shift: WaiterShiftTeamInfo): string[] {
  const members: string[] = [shift.waiter_name];
  if (shift.second_waiter_name) {
    members.push(shift.second_waiter_name);
  }
  if (shift.additional_waiters?.length) {
    for (const aw of shift.additional_waiters) {
      if (aw) members.push(aw);
    }
  }
  return members;
}

/**
 * Counts total shares for pool distribution across shifts.
 * Only counts shifts where participates_in_pool is true.
 * Each team member (primary + second + additional) counts as 1 share.
 */
export function countPoolShares(shifts: WaiterShiftTeamInfo[]): number {
  return shifts.reduce((count, s) => {
    if (s.participates_in_pool === false) return count;
    return count + getAllTeamMembers(s).length;
  }, 0);
}

/**
 * Returns the number of additional team members (second + additional waiters).
 * Useful for dividing POS sales across a team.
 */
export function getTeamSize(shift: WaiterShiftTeamInfo): number {
  return getAllTeamMembers(shift).length;
}
