/**
 * Shared class-name merge helper.
 *
 * Combines conditional class values with clsx and resolves conflicting
 * Tailwind utilities with tailwind-merge.
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names and resolves Tailwind conflicts.
 *
 * @param inputs Conditional class values.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
