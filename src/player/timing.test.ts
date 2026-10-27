// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
    FLOW_DURATION_MS,
    FLOW_SETTLE_MS,
    microcycleDelay,
    packetDuration,
    PACKET_SPEED,
} from './timing';

describe('animation timing', () => {
    it('disables the delay when animation is off', () => {
        expect(microcycleDelay(0)).toBe(0);
    });

    it('reserves enough time for the longest packet route', () => {
        const delay = microcycleDelay(1);

        expect(delay).toBeGreaterThanOrEqual(FLOW_DURATION_MS + FLOW_SETTLE_MS);
    });

    it('scales the delay with playback speed', () => {
        expect(microcycleDelay(2)).toBe(microcycleDelay(1) / 2);
        expect(microcycleDelay(4)).toBe(microcycleDelay(1) / 4);
    });

    it('uses the same packet speed for every route length', () => {
        const short = packetDuration(100);
        const long = packetDuration(400);

        expect(100 / short).toBeCloseTo(PACKET_SPEED, 5);
        expect(400 / long).toBeCloseTo(PACKET_SPEED, 5);
    });

    it('scales packet duration with playback speed', () => {
        expect(packetDuration(200, 0.5)).toBe(packetDuration(200) / 2);
    });

    it('keeps very short routes visible', () => {
        expect(packetDuration(1)).toBe(80);
    });
});
