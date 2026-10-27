/**
 * Micro-ops emitted by the MOPS VM.
 *
 * A micro-op describes one transfer or calculation step. Visual cues are
 * derived from these values by the player.
 *
 * @module core/vm/microops
 */

/**
 * One machine transfer or calculation.
 *
 * The player derives visual cues from these values; the VM does not know about
 * diagram elements.
 */
export type MicroOp =
    | { readonly kind: 'BZ_READ' }
    | { readonly kind: 'MEM_READ'; readonly width: 1 | 2 }
    | { readonly kind: 'BR_WRITE' }
    | { readonly kind: 'DECODE' }
    | { readonly kind: 'BZ_UPDATE' }
    | { readonly kind: 'BR_READ_OPERAND' }
    | { readonly kind: 'INPUT_READ' }
    | { readonly kind: 'MEM_WRITE' }
    | { readonly kind: 'AC_WRITE' }
    | { readonly kind: 'AC_READ' }
    | { readonly kind: 'OP_WRITE' }
    | { readonly kind: 'AR_WRITE' }
    | { readonly kind: 'ALU_CALC' }
    | { readonly kind: 'ERG_AC_WRITE' }
    | { readonly kind: 'ERG_VGL_WRITE' }
    | { readonly kind: 'AUS_WRITE' }
    | { readonly kind: 'VGL_READ' }
    | { readonly kind: 'BZ_WRITE' }
    | { readonly kind: 'HALT' };

/** Instruction-processing phase. */
export type Phase = 'FETCH' | 'DECODE' | 'EXECUTE' | 'HALTED';

/** Last comparison result, or empty when no comparison has run. */
export type Compare = '' | '<' | '=' | '>';
