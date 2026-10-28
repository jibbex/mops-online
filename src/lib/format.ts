/**
 * Display formatting helpers for MOPS values.
 *
 * @module lib/format
 */

/**
 * Formats a machine word as five decimal characters.
 *
 * @param value Word in the MOPS word range.
 * @returns Zero-padded, sign-preserving text.
 */
export function formatWord(value: number): string {
    if (value < 0) {
        return `-${Math.abs(value).toString().padStart(4, '0')}`;
    }

    return value.toString().padStart(5, '0');
}

/**
 * Formats a memory address as two decimal characters.
 *
 * @param value Address in the range 0..71.
 * @returns Zero-padded address text.
 */
export function formatAddress(value: number): string {
    return value.toString().padStart(2, '0');
}

/**
 * Formats an internal bus value, including two-cell memory transfers.
 *
 * @param value Single word or address/data pair.
 * @returns Display text for the bus or register.
 */
export function formatBusValue(
    value: number | readonly [number, number],
): string {
    if (typeof value === 'number') {
        return formatWord(value);
    }

    return `${formatWord(value[0])}|${formatWord(value[1])}`;
}
