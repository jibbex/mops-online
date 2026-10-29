/**
 * Data for the guided first-run tour.
 *
 * Each step selects a diagram element by its data-tour attribute, or uses a
 * centered card when it has no target. Demo visuals use the same active and
 * operation data as real VM events, so the tour explains the actual diagram
 * language instead of a separate illustration.
 *
 * @module tour/tour-steps
 */

import type { MessageKey } from '@/i18n/messages';
import {
    EMPTY_VISUAL,
    type VisualOperation,
    type VisualState,
} from '@/player/visual-map';

export type TourStepId =
    'welcome' | 'unit' | 'read' | 'write' | 'increment' | 'bus';

export interface TourDemo {
    readonly active: readonly string[];
    readonly operations: readonly (readonly [string, VisualOperation])[];
}

export interface TourStep {
    readonly id: TourStepId;
    /** One-based position shown as "Step 2 of 6". */
    readonly position: number;
    readonly previous: TourStepId | null;
    readonly next: TourStepId | null;
    /** Value of the data-tour attribute, or null for a centered card. */
    readonly target: string | null;
    readonly titleKey: MessageKey;
    readonly bodyKey: MessageKey;
    readonly demo: TourDemo | null;
}

export const TOUR_STEPS: Readonly<Record<TourStepId, TourStep>> = {
    welcome: {
        id: 'welcome',
        position: 1,
        previous: null,
        next: 'unit',
        target: null,
        titleKey: 'tour.welcome.title',
        bodyKey: 'tour.welcome.body',
        demo: null,
    },
    unit: {
        id: 'unit',
        position: 2,
        previous: 'welcome',
        next: 'read',
        target: 'control-unit',
        titleKey: 'tour.unit.title',
        bodyKey: 'tour.unit.body',
        demo: {
            active: ['control'],
            operations: [],
        },
    },
    read: {
        id: 'read',
        position: 3,
        previous: 'unit',
        next: 'write',
        target: 'pc',
        titleKey: 'tour.read.title',
        bodyKey: 'tour.read.body',
        demo: {
            active: ['control', 'pc'],
            operations: [['pc', 'read']],
        },
    },
    write: {
        id: 'write',
        position: 4,
        previous: 'read',
        next: 'increment',
        target: 'br',
        titleKey: 'tour.write.title',
        bodyKey: 'tour.write.body',
        demo: {
            active: ['control', 'br'],
            operations: [['br', 'write']],
        },
    },
    increment: {
        id: 'increment',
        position: 5,
        previous: 'write',
        next: 'bus',
        target: 'pc',
        titleKey: 'tour.increment.title',
        bodyKey: 'tour.increment.body',
        demo: {
            active: ['control', 'pc'],
            operations: [['pc', 'increment']],
        },
    },
    bus: {
        id: 'bus',
        position: 6,
        previous: 'increment',
        next: null,
        target: 'bus',
        titleKey: 'tour.bus.title',
        bodyKey: 'tour.bus.body',
        demo: null,
    },
};

export const FIRST_TOUR_STEP: TourStepId = 'welcome';

export const TOUR_STEP_COUNT = 6;

/**
 * Returns the visual state used while a tour step is open.
 *
 * Steps without a demo use the neutral state from the real diagram.
 *
 * @param step Tour step.
 */
export function tourVisualState(step: TourStep): VisualState {
    if (step.demo === null) {
        return EMPTY_VISUAL;
    }

    return {
        active: new Set(step.demo.active),
        operations: new Map(step.demo.operations),
        memoryCells: [],
        memoryBars: [],
        transfer: null,
    };
}
