/**
 * Execution vocabulary shared by the ISA and the VM.
 *
 * Instruction declarations embed execution sequences, so these types live in
 * the ISA layer. This keeps the dependency direction one-way: the VM may import
 * the ISA, but the ISA never imports the VM.
 *
 * @module core/isa/execution
 */

/**
 * One machine transfer or calculation.
 *
 * The player derives visual cues from these values; the VM does not know about
 * diagram elements.
 */
export type MicroOp =
    | { readonly kind: 'PC_READ' }
    | { readonly kind: 'MEM_READ' }
    | { readonly kind: 'BR_WRITE' }
    | { readonly kind: 'DECODE' }
    | { readonly kind: 'PC_UPDATE' }
    | { readonly kind: 'BR_WRITE_OPERAND' }
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
    | { readonly kind: 'PC_WRITE' }
    | { readonly kind: 'HALT' };

/** Instruction-processing phase. */
export type Phase = 'FETCH' | 'DECODE' | 'EXECUTE' | 'HALTED';

/** Last comparison result, or empty when no comparison has run. */
export type Compare = '' | '<' | '=' | '>';
