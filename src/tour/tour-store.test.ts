// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { createTourStore } from './tour-store';
import { TOUR_STORAGE_KEY } from './tour-storage';
import { TOUR_STEP_COUNT } from './tour-steps';

describe('tour store', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts at the first step and marks the tour as started', () => {
        const store = createTourStore();

        store.getState().start();

        expect(store.getState().stepId).toBe('welcome');
        expect(store.getState().started).toBe(true);
    });

    it('advances through every step and closes after the last one', () => {
        const store = createTourStore();

        store.getState().start();

        for (let index = 1; index < TOUR_STEP_COUNT; index += 1) {
            store.getState().next();
        }

        expect(store.getState().stepId).toBe('bus');
        expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBeNull();

        store.getState().next();

        expect(store.getState().stepId).toBeNull();
        expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    });

    it('goes back from the second step', () => {
        const store = createTourStore();

        store.getState().start();
        store.getState().next();
        store.getState().back();

        expect(store.getState().stepId).toBe('welcome');
    });

    it('stays on the first step when going back', () => {
        const store = createTourStore();

        store.getState().start();
        store.getState().back();

        expect(store.getState().stepId).toBe('welcome');
    });

    it('does nothing when closed', () => {
        const store = createTourStore();

        store.getState().next();
        store.getState().back();

        expect(store.getState().stepId).toBeNull();
        expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBeNull();
    });

    it('writes the seen flag on close and keeps the started flag', () => {
        const store = createTourStore();

        store.getState().start();
        store.getState().close();

        expect(store.getState().stepId).toBeNull();
        expect(store.getState().started).toBe(true);
        expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    });
});
