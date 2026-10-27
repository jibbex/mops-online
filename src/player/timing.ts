/**
 * Shared animation timing for machine data flow.
 *
 * The player schedules microcycles no faster than the packet train needs to
 * complete, so every transfer is visible as a whole.
 *
 * @module player/timing
 */

/** Base duration of one complete packet traversal at normal speed. */
export const FLOW_DURATION_MS = 1000;

/** Extra time between packet arrival and the next microcycle. */
export const FLOW_SETTLE_MS = 100;

/**
 * Packet speed in SVG user units per millisecond at normal playback speed.
 *
 * All routes use this speed, so a long route takes proportionally longer than
 * a short one instead of making short routes flash by.
 */
export const PACKET_SPEED = 0.5;

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

/**
 * Returns the travel time for a route at the shared packet speed.
 *
 * @param pathLength Route length in SVG user units.
 * @param durationScale Playback duration scale; 1 at normal speed, 0.5 at 2x.
 * @returns Duration in milliseconds.
 */
export function packetDuration(pathLength: number, durationScale = 1): number {
    const base = pathLength / PACKET_SPEED;

    return Math.max(80, Math.round(base * durationScale));
}
