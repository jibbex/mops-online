/**
 * Guided tour state.
 *
 * The store mirrors the player store pattern so tests and embedders can create
 * independent tour instances. Persistence is written only when the tour closes.
 *
 * @module tour/tour-store
 */

import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { writeTourSeen } from './tour-storage';
import { FIRST_TOUR_STEP, TOUR_STEPS, type TourStepId } from './tour-steps';

export interface TourState {
    /** Open step, or null when the tour is closed. */
    readonly stepId: TourStepId | null;
    /** True after the first open in this page load. */
    readonly started: boolean;
    readonly start: () => void;
    readonly next: () => void;
    readonly back: () => void;
    readonly close: () => void;
}

/**
 * Creates an isolated tour store.
 */
export function createTourStore(): UseBoundStore<StoreApi<TourState>> {
    return create<TourState>((set, get) => ({
        stepId: null,
        started: false,

        start: () => set({ stepId: FIRST_TOUR_STEP, started: true }),

        next: () => {
            const { stepId } = get();

            if (stepId === null) {
                return;
            }

            const nextId = TOUR_STEPS[stepId].next;

            if (nextId === null) {
                set({ stepId: null });
                writeTourSeen();
                return;
            }

            set({ stepId: nextId });
        },

        back: () => {
            const { stepId } = get();

            if (stepId === null) {
                return;
            }

            const previous = TOUR_STEPS[stepId].previous;

            if (previous === null) {
                return;
            }

            set({ stepId: previous });
        },

        close: () => {
            set({ stepId: null });
            writeTourSeen();
        },
    }));
}

/**
 * Default tour instance used by the application shell.
 */
export const useTour = createTourStore();
