/**
 * Display formatting helpers for MOPS values.
 *
 * @module lib/format
 */

export function formatWord(value: number): string {
    if (value < 0) {
        return `-${Math.abs(value).toString().padStart(4, '0')}`;
    }

    return value.toString().padStart(5, '0');
}

export function formatAddress(value: number): string {
    return value.toString().padStart(2, '0');
}

export function formatBusValue(
    value: number | readonly [number, number],
): string {
    if (typeof value === 'number') {
        return formatWord(value);
    }

    return `${formatWord(value[0])}|${formatWord(value[1])}`;
}
