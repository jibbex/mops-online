// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readTourSeen, TOUR_STORAGE_KEY, writeTourSeen } from './tour-storage';

describe('tour storage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('defaults to not seen', () => {
        expect(readTourSeen()).toBe(false);
    });

    it('reports seen after it was written', () => {
        writeTourSeen();

        expect(readTourSeen()).toBe(true);
        expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    });

    it('rejects a different stored value', () => {
        localStorage.setItem(TOUR_STORAGE_KEY, '0');

        expect(readTourSeen()).toBe(false);
    });

    it('returns false when reading storage throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('Storage is blocked.');
        });

        expect(readTourSeen()).toBe(false);
    });

    it('ignores write failures', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('Storage is blocked.');
        });

        expect(() => writeTourSeen()).not.toThrow();
    });
});
