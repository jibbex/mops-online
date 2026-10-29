/**
 * Persistence for the guided tour.
 *
 * Storage can be unavailable in private browsing or embedded contexts. The
 * tour still works for the current page load; it just opens again next time.
 *
 * @module tour/tour-storage
 */

export const TOUR_STORAGE_KEY = 'mops-tour-seen';

/**
 * Returns whether the tour was completed or skipped in an earlier visit.
 */
export function readTourSeen(): boolean {
    try {
        return localStorage.getItem(TOUR_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Records that the tour was completed or skipped.
 */
export function writeTourSeen(): void {
    try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch {
        // Storage is optional; the page-load guard still prevents a reopen.
    }
}
