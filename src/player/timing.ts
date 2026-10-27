/**
 * Shared animation timing for machine data flow.
 *
 * The player schedules microcycles no faster than the packet train needs to
 * complete, so every transfer is visible as a whole.
 *
 * @module player/timing
 */

/** Base duration of one packet traversal at normal speed. */
export const FLOW_DURATION_MS = 600;

/** Extra time for trailing packets in the train. */
export const FLOW_SETTLE_MS = 180;

/**
 * Returns the delay between two animated microcycles.
 *
 * @param speed Playback multiplier; zero disables animation and delay.
 * @returns Delay in milliseconds.
 */
export function microcycleDelay(speed: number): number {
    if (speed <= 0) {
        return 0;
    }

    return Math.max(
        40,
        Math.round((FLOW_DURATION_MS + FLOW_SETTLE_MS) / speed),
    );
}
