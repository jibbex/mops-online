// @vitest-environment jsdom

import { usePlayer, type PlayerStatus } from '@/player/player';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTour, shouldAutoStart } from './tour-actions';
import { useTour } from './tour-store';

interface AutoStartCase {
    readonly name: string;
    readonly seen: boolean;
    readonly started: boolean;
    readonly status: PlayerStatus;
    readonly historyLength: number;
    readonly expected: boolean;
}

const CASES: readonly AutoStartCase[] = [
    {
        name: 'already seen',
        seen: true,
        started: false,
        status: 'paused',
        historyLength: 1,
        expected: false,
    },
    {
        name: 'started earlier in this page load',
        seen: false,
        started: true,
        status: 'paused',
        historyLength: 1,
        expected: false,
    },
    {
        name: 'no executed step',
        seen: false,
        started: false,
        status: 'paused',
        historyLength: 0,
        expected: false,
    },
    {
        name: 'idle',
        seen: false,
        started: false,
        status: 'idle',
        historyLength: 1,
        expected: false,
    },
    {
        name: 'ready',
        seen: false,
        started: false,
        status: 'ready',
        historyLength: 1,
        expected: false,
    },
    {
        name: 'finished',
        seen: false,
        started: false,
        status: 'finished',
        historyLength: 1,
        expected: false,
    },
    {
        name: 'running',
        seen: false,
        started: false,
        status: 'running',
        historyLength: 1,
        expected: true,
    },
    {
        name: 'paused',
        seen: false,
        started: false,
        status: 'paused',
        historyLength: 1,
        expected: true,
    },
];

describe('shouldAutoStart', () => {
    it.each(CASES)('$name returns $expected', (input) => {
        expect(
            shouldAutoStart({
                seen: input.seen,
                started: input.started,
                status: input.status,
                historyLength: input.historyLength,
            }),
        ).toBe(input.expected);
    });
});

describe('openTour', () => {
    beforeEach(() => {
        localStorage.clear();
        usePlayer.getState().stop();
        useTour.setState({ stepId: null, started: false });
    });

    afterEach(() => {
        usePlayer.getState().stop();
        useTour.setState({ stepId: null, started: false });
    });

    it('pauses a running player and opens the first step', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().start();

        expect(usePlayer.getState().status).toBe('running');

        openTour();

        expect(usePlayer.getState().status).toBe('paused');
        expect(useTour.getState().stepId).toBe('welcome');
        expect(useTour.getState().started).toBe(true);
    });
});
