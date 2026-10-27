// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import {
    MAX_WORD,
    MIN_WORD,
    ObjectProgramValidationError,
    assertObjectProgram,
    isAddress,
    isWord,
    validateObjectProgram,
    type ObjectProgram,
} from './program';

function candidate(program: ObjectProgram): Record<string, unknown> {
    return {
        memory: [...program.memory],
        sourceMap: [...program.sourceMap],
        symbols: program.symbols,
        listing: program.listing.map((entry) => ({
            ...entry,
            words: [...entry.words],
        })),
        entry: program.entry,
        ...(program.endAddress === undefined
            ? {}
            : { endAddress: program.endAddress }),
    };
}

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

describe('validateObjectProgram', () => {
    it('accepts a valid object program', () => {
        const program = createObjectProgramFixture();
        const result = validateObjectProgram(program);

        expect(result.ok).toBe(true);

        if (!result.ok) {
            return;
        }

        expect(result.program.symbols).toBeInstanceOf(Map);
        expect(result.program.symbols.get('start')).toBe(0);
        expect(result.program.memory).toHaveLength(72);
        expect(result.program.sourceMap).toHaveLength(72);
        expect(result.program.listing).toHaveLength(3);
    });

    it('normalizes a plain symbol object to a Map', () => {
        const program = createObjectProgramFixture();
        const result = validateObjectProgram({
            ...candidate(program),
            symbols: { start: 0, value: 64 },
        });

        expect(result.ok).toBe(true);

        if (!result.ok) {
            return;
        }

        expect(result.program.symbols).toBeInstanceOf(Map);
        expect(result.program.symbols.get('value')).toBe(64);
    });

    it('rejects non-object values', () => {
        for (const value of [null, 42, 'program', []]) {
            const result = validateObjectProgram(value);

            expect(result.ok).toBe(false);

            if (!result.ok) {
                expect(result.issues[0]?.path).toBe('$');
            }
        }
    });

    it('rejects an invalid memory image', () => {
        const program = createObjectProgramFixture();
        const result = validateObjectProgram({
            ...candidate(program),
            memory: [1, 2],
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(
                result.issues.some((issue) => issue.path === '$.memory'),
            ).toBe(true);
        }
    });

    it('rejects memory cells outside the word range', () => {
        const program = createObjectProgramFixture();
        const memory = [...program.memory];
        memory[0] = MAX_WORD + 1;

        const result = validateObjectProgram({
            ...candidate(program),
            memory,
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(
                result.issues.some((issue) => issue.path === '$.memory[0]'),
            ).toBe(true);
        }
    });

    it('rejects an invalid source map', () => {
        const program = createObjectProgramFixture();
        const sourceMap = [...program.sourceMap];
        sourceMap[0] = -1;

        const result = validateObjectProgram({
            ...candidate(program),
            sourceMap,
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(
                result.issues.some((issue) => issue.path === '$.sourceMap[0]'),
            ).toBe(true);
        }
    });

    it('rejects an invalid entry address', () => {
        const program = createObjectProgramFixture();
        const result = validateObjectProgram({
            ...candidate(program),
            entry: 72,
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(
                result.issues.some((issue) => issue.path === '$.entry'),
            ).toBe(true);
        }
    });

    it('rejects an invalid end address', () => {
        const program = createObjectProgramFixture();
        const result = validateObjectProgram({
            ...candidate(program),
            endAddress: 72,
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(
                result.issues.some((issue) => issue.path === '$.endAddress'),
            ).toBe(true);
        }
    });

    it('rejects invalid symbol addresses', () => {
        const program = createObjectProgramFixture();
        const result = validateObjectProgram({
            ...candidate(program),
            symbols: new Map([['start', 72]]),
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(
                result.issues.some((issue) => issue.path === '$.symbols.start'),
            ).toBe(true);
        }
    });

    it('rejects invalid listing entries', () => {
        const program = createObjectProgramFixture();
        const result = validateObjectProgram({
            ...candidate(program),
            listing: [
                {
                    line: 0,
                    address: 0,
                    words: [],
                    source: 42,
                },
            ],
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            const paths = result.issues.map((issue) => issue.path);
            expect(paths).toContain('$.listing[0].line');
            expect(paths).toContain('$.listing[0].words');
            expect(paths).toContain('$.listing[0].source');
        }
    });

    it('rejects overlapping listing entries', () => {
        const program = createObjectProgramFixture();
        const [first] = program.listing;

        if (!first) {
            throw new Error('Fixture must contain a listing entry.');
        }

        const result = validateObjectProgram({
            ...candidate(program),
            listing: [
                first,
                {
                    line: 2,
                    address: 1,
                    words: [30],
                    source: 'overlap',
                },
            ],
        });

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(
                result.issues.some((issue) =>
                    issue.message.includes('must not overlap'),
                ),
            ).toBe(true);
        }
    });
});

describe('assertObjectProgram', () => {
    it('accepts a valid program', () => {
        const program = createObjectProgramFixture();

        expect(() => assertObjectProgram(program)).not.toThrow();
    });

    it('throws a validation error with issues', () => {
        const program = createObjectProgramFixture();
        const invalid = {
            ...candidate(program),
            entry: 99,
        };

        expect(() => assertObjectProgram(invalid)).toThrow(
            ObjectProgramValidationError,
        );

        try {
            assertObjectProgram(invalid);
        } catch (error) {
            expect(error).toBeInstanceOf(ObjectProgramValidationError);
            expect(
                (error as ObjectProgramValidationError).issues,
            ).not.toHaveLength(0);
        }
    });
});
