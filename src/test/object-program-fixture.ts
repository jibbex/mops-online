/**
 * Shared object-program fixture for unit tests.
 *
 * @module test/object-program-fixture
 */

import { MEMORY_SIZE, NO_SOURCE_LINE, type ObjectProgram } from '@/core/object';

/**
 * Returns a small valid object program used by unit tests.
 */
export function createObjectProgramFixture(): ObjectProgram {
    const memory = Array<number>(MEMORY_SIZE).fill(0);
    memory[0] = 11;
    memory[1] = 5;
    memory[2] = 30;
    memory[3] = 64;
    memory[4] = 60;

    const sourceMap = Array<number>(MEMORY_SIZE).fill(NO_SOURCE_LINE);
    sourceMap[0] = 1;
    sourceMap[1] = 1;
    sourceMap[2] = 2;
    sourceMap[3] = 2;
    sourceMap[4] = 3;

    return {
        memory,
        sourceMap,
        symbols: new Map([
            ['start', 0],
            ['value', 64],
        ]),
        listing: [
            {
                line: 1,
                address: 0,
                words: [11, 5],
                source: 'ld 5',
            },
            {
                line: 2,
                address: 2,
                words: [30, 64],
                source: 'add value',
            },
            {
                line: 3,
                address: 4,
                words: [60],
                source: 'end',
            },
        ],
        entry: 0,
        endAddress: 4,
    };
}
