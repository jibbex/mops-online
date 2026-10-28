// @vitest-environment node

import { describe, expectTypeOf, it } from 'vitest';
import type { Compare, MicroOp, Phase } from './microops';

describe('micro-op types', () => {
    it('lists every micro-op kind', () => {
        expectTypeOf<MicroOp['kind']>().toEqualTypeOf<
            | 'BZ_READ'
            | 'MEM_READ'
            | 'BR_WRITE'
            | 'DECODE'
            | 'BZ_UPDATE'
            | 'BR_READ_OPERAND'
            | 'INPUT_READ'
            | 'MEM_WRITE'
            | 'AC_WRITE'
            | 'AC_READ'
            | 'OP_WRITE'
            | 'AR_WRITE'
            | 'ALU_CALC'
            | 'ERG_AC_WRITE'
            | 'ERG_VGL_WRITE'
            | 'AUS_WRITE'
            | 'VGL_READ'
            | 'BZ_WRITE'
            | 'HALT'
        >();
    });

    it('lists every machine phase', () => {
        expectTypeOf<Phase>().toEqualTypeOf<
            'FETCH' | 'DECODE' | 'EXECUTE' | 'HALTED'
        >();
    });

    it('lists every comparison value', () => {
        expectTypeOf<Compare>().toEqualTypeOf<'' | '<' | '=' | '>'>();
    });
});
