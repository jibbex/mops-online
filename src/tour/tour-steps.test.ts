// @vitest-environment node

import { createCpu, stepCpu, type VmEvent } from '@/core/vm';
import { messages } from '@/i18n/messages';
import {
    EMPTY_VISUAL,
    visualStateFor,
    type VisualState,
} from '@/player/visual-map';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { describe, expect, it } from 'vitest';
import {
    FIRST_TOUR_STEP,
    TOUR_STEPS,
    TOUR_STEP_COUNT,
    tourVisualState,
    type TourStep,
    type TourStepId,
} from './tour-steps';

function activeIds(state: VisualState): string[] {
    return [...state.active].sort();
}

function operationEntries(state: VisualState): [string, string][] {
    return [...state.operations.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
    );
}

function firstEvent(
    events: readonly VmEvent[],
    kind: VmEvent['microOp']['kind'],
): VmEvent {
    const event = events.find((candidate) => candidate.microOp.kind === kind);

    if (!event) {
        throw new Error(`No ${kind} event was recorded.`);
    }

    return event;
}

describe('TOUR_STEPS', () => {
    it('forms a consistent forward and backward chain', () => {
        let current: TourStepId | null = FIRST_TOUR_STEP;
        let previous: TourStepId | null = null;
        const visited: TourStepId[] = [];

        while (current !== null) {
            const step: TourStep = TOUR_STEPS[current];

            expect(step.id).toBe(current);
            expect(step.previous).toBe(previous);
            expect(step.position).toBe(visited.length + 1);

            visited.push(current);
            previous = current;
            current = step.next;
        }

        expect(visited).toHaveLength(TOUR_STEP_COUNT);

        const lastId = visited[visited.length - 1];

        if (lastId === undefined) {
            throw new Error('Tour chain is empty.');
        }

        expect(TOUR_STEPS[lastId].next).toBeNull();
    });

    it('has translations for every title and body', () => {
        for (const id of Object.keys(TOUR_STEPS) as TourStepId[]) {
            const step = TOUR_STEPS[id];

            expect(messages.en[step.titleKey]).toBeTruthy();
            expect(messages.de[step.titleKey]).toBeTruthy();
            expect(messages.en[step.bodyKey]).toBeTruthy();
            expect(messages.de[step.bodyKey]).toBeTruthy();
        }
    });
});

describe('tourVisualState', () => {
    it('matches the real diagram states for read, write, and increment', () => {
        const events: VmEvent[] = [];
        let state = createCpu(createObjectProgramFixture());

        for (let index = 0; index < 20; index += 1) {
            const result = stepCpu(state);

            if (result.kind === 'trap' || result.kind === 'input-required') {
                throw new Error('The fixture must not trap or request input.');
            }

            if (result.event === undefined) {
                throw new Error('Expected a VM event.');
            }

            events.push(result.event);
            state = result.state;

            if (result.kind === 'halted') {
                break;
            }
        }

        const read = firstEvent(events, 'PC_READ');
        const write = firstEvent(events, 'BR_WRITE');
        const increment = firstEvent(events, 'PC_UPDATE');

        expect(activeIds(visualStateFor(read))).toEqual(
            activeIds(tourVisualState(TOUR_STEPS.read)),
        );
        expect(operationEntries(visualStateFor(read))).toEqual(
            operationEntries(tourVisualState(TOUR_STEPS.read)),
        );
        expect(activeIds(visualStateFor(write))).toEqual(
            activeIds(tourVisualState(TOUR_STEPS.write)),
        );
        expect(operationEntries(visualStateFor(write))).toEqual(
            operationEntries(tourVisualState(TOUR_STEPS.write)),
        );
        expect(activeIds(visualStateFor(increment))).toEqual(
            activeIds(tourVisualState(TOUR_STEPS.increment)),
        );
        expect(operationEntries(visualStateFor(increment))).toEqual(
            operationEntries(tourVisualState(TOUR_STEPS.increment)),
        );
    });

    it('returns the empty visual state for steps without a demo', () => {
        expect(tourVisualState(TOUR_STEPS.welcome)).toBe(EMPTY_VISUAL);
        expect(tourVisualState(TOUR_STEPS.bus)).toBe(EMPTY_VISUAL);
    });

    it('never sets a bus transfer', () => {
        for (const id of Object.keys(TOUR_STEPS) as TourStepId[]) {
            expect(tourVisualState(TOUR_STEPS[id]).transfer).toBeNull();
        }
    });
});
