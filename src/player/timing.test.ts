// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { FLOW_DURATION_MS, FLOW_SETTLE_MS, microcycleDelay } from './timing';

describe('animation timing', () => {
    it('disables the delay when animation is off', () => {
        expect(microcycleDelay(0)).toBe(0);
    });

    it('reserves enough time for the full packet train', () => {
        const delay = microcycleDelay(1);

        expect(delay).toBeGreaterThanOrEqual(FLOW_DURATION_MS + FLOW_SETTLE_MS);
    });

    it('scales the delay with playback speed', () => {
        expect(microcycleDelay(2)).toBe(microcycleDelay(1) / 2);
        expect(microcycleDelay(4)).toBe(microcycleDelay(1) / 4);
    });
});
