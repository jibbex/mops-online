// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { ObjectProgramValidationError, type ObjectProgram } from './program';
import {
    parseObjectProgram,
    serializeObjectProgram,
    toSerializedObjectProgram,
} from './serialize';

describe('object program serialization', () => {
    it('converts maps and arrays to JSON-safe values', () => {
        const program = createObjectProgramFixture();
        const serialized = toSerializedObjectProgram(program);

        expect(serialized.symbols).toEqual({
            start: 0,
            value: 64,
        });
        expect(Array.isArray(serialized.memory)).toBe(true);
        expect(Array.isArray(serialized.sourceMap)).toBe(true);
        expect(Array.isArray(serialized.listing)).toBe(true);
        expect(serialized.endAddress).toBe(4);
    });

    it('round-trips an object program', () => {
        const program = createObjectProgramFixture();
        const parsed = parseObjectProgram(serializeObjectProgram(program));

        expect(parsed.memory).toEqual(program.memory);
        expect(parsed.sourceMap).toEqual(program.sourceMap);
        expect(parsed.symbols).toEqual(program.symbols);
        expect(parsed.listing).toEqual(program.listing);
        expect(parsed.entry).toBe(program.entry);
        expect(parsed.endAddress).toBe(program.endAddress);
    });

    it('normalizes symbols to a Map when parsing', () => {
        const program = createObjectProgramFixture();
        const parsed = parseObjectProgram(serializeObjectProgram(program));

        expect(parsed.symbols).toBeInstanceOf(Map);
        expect(parsed.symbols.get('start')).toBe(0);
    });

    it('omits an absent end address', () => {
        const program = createObjectProgramFixture();
        const withoutEnd: ObjectProgram = {
            ...program,
            endAddress: undefined,
        };

        const serialized = toSerializedObjectProgram(withoutEnd);

        expect(Object.hasOwn(serialized, 'endAddress')).toBe(false);
    });

    it('rejects invalid JSON', () => {
        expect(() => parseObjectProgram('{')).toThrow(
            ObjectProgramValidationError,
        );
    });

    it('rejects invalid serialized structures', () => {
        expect(() =>
            parseObjectProgram(
                JSON.stringify({
                    ...toSerializedObjectProgram(createObjectProgramFixture()),
                    entry: 99,
                }),
            ),
        ).toThrow(ObjectProgramValidationError);
    });

    it('rejects invalid programs during serialization', () => {
        const program = createObjectProgramFixture();
        const invalid: ObjectProgram = {
            ...program,
            entry: 99,
        };

        expect(() => serializeObjectProgram(invalid)).toThrow(
            ObjectProgramValidationError,
        );
    });
});
