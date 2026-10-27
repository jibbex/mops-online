/**
 * Vitest DOM test setup.
 *
 * Adds jest-dom matchers, a deterministic `matchMedia` implementation, and the
 * minimal Range geometry that CodeMirror expects during layout measurement.
 *
 * @module test/setup
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    installRangeGeometry();
}

/**
 * Installs the Range geometry methods CodeMirror uses for coordinate lookup.
 *
 * jsdom implements neither method, which causes noisy layout errors when the
 * editor is mounted in component tests.
 */
function installRangeGeometry(): void {
    const rect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ({}),
    } as DOMRect;

    const rects = [rect] as unknown as DOMRectList & {
        item: (index: number) => DOMRect | null;
    };
    rects.item = (index) => rects[index] ?? null;

    Object.defineProperty(Range.prototype, 'getClientRects', {
        configurable: true,
        value: () => rects,
    });
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: () => rect,
    });
}
