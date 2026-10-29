// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
    DATA_END,
    DATA_START,
    MAX_WORD,
    MEMORY_SIZE,
    MIN_WORD,
    isAddress,
    isWord,
} from './program';

describe('machine limits', () => {
    it('defines the documented memory layout', () => {
        expect(MEMORY_SIZE).toBe(72);
        expect(DATA_START).toBe(64);
        expect(DATA_END).toBe(71);
        expect(MIN_WORD).toBe(-9999);
        expect(MAX_WORD).toBe(9999);
    });
});

describe('word and address guards', () => {
    it('accepts the full word range', () => {
        expect(isWord(MIN_WORD)).toBe(true);
        expect(isWord(MAX_WORD)).toBe(true);
        expect(isWord(0)).toBe(true);
        expect(isWord(-1)).toBe(true);
    });

    it('rejects invalid words', () => {
        expect(isWord(MIN_WORD - 1)).toBe(false);
        expect(isWord(MAX_WORD + 1)).toBe(false);
        expect(isWord(1.5)).toBe(false);
        expect(isWord('5')).toBe(false);
        expect(isWord(Number.NaN)).toBe(false);
    });

    it('accepts valid addresses', () => {
        expect(isAddress(0)).toBe(true);
        expect(isAddress(71)).toBe(true);
    });

    it('rejects invalid addresses', () => {
        expect(isAddress(-1)).toBe(false);
        expect(isAddress(72)).toBe(false);
        expect(isAddress(1.5)).toBe(false);
        expect(isAddress('0')).toBe(false);
    });
});
