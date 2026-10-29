/**
 * Tour orchestration shared by the auto-start controller and header button.
 *
 * @module tour/tour-actions
 */

import { usePlayer, type PlayerStatus } from '@/player/player';
import { useTour } from './tour-store';

/**
 * Pauses the machine and opens the tour at its first step.
 */
export function openTour(): void {
    usePlayer.getState().pause();
    useTour.getState().start();
}

/**
 * Returns whether the tour should open after a machine step.
 *
 * It opens at most once per page load, only after the first executed step, and
 * only while the machine is running or paused.
 */
export function shouldAutoStart(input: {
    readonly seen: boolean;
    readonly started: boolean;
    readonly status: PlayerStatus;
    readonly historyLength: number;
}): boolean {
    return (
        !input.seen &&
        !input.started &&
        input.historyLength > 0 &&
        (input.status === 'running' || input.status === 'paused')
    );
}
