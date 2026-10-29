// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { MAX_WORD, MIN_WORD } from '@/core/object';
import { formatAddress, formatBusValue, formatWord } from './format';

describe('formatWord', () => {
    it('pads positive values and preserves the word width', () => {
        expect(formatWord(0)).toBe('00000');
        expect(formatWord(8)).toBe('00008');
        expect(formatWord(MAX_WORD)).toBe('09999');
    });

    it('formats negative values with a sign and four digits', () => {
        expect(formatWord(-1)).toBe('-0001');
        expect(formatWord(-42)).toBe('-0042');
        expect(formatWord(MIN_WORD)).toBe('-9999');
    });
});

describe('formatAddress', () => {
    it('pads addresses to two digits', () => {
        expect(formatAddress(0)).toBe('00');
        expect(formatAddress(9)).toBe('09');
        expect(formatAddress(71)).toBe('71');
    });
});

describe('formatBusValue', () => {
    it('formats single words', () => {
        expect(formatBusValue(5)).toBe('00005');
        expect(formatBusValue(-5)).toBe('-0005');
    });

    it('joins two-cell transfers with a separator', () => {
        expect(formatBusValue([5, 64])).toBe('00005|00064');
    });
});
