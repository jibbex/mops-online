/**
 * Shared SVG design coordinates for the von Neumann diagram.
 *
 * The diagram uses a fixed coordinate system so it scales without measuring
 * the container.
 *
 * @module components/vnr-layout
 */

/** SVG viewBox for the complete machine diagram. */
export const VNR_VIEW_BOX = '0 0 520 510';

/** Memory columns rendered by the diagram. */
export const MEMORY_COLUMNS = [0, 1, 2] as const;

/** One permanent bus or signal path. */
export interface BusPath {
    readonly id: string;
    readonly d: string;
    readonly thin?: boolean;
}

/** Permanent bus and signal paths behind the machine units. */
export const BUS_PATHS: readonly BusPath[] = [
    { id: 'sl-trunk', d: 'M300 59 V480' },
    { id: 'sl-mem', d: 'M257 59 H300' },
    { id: 'sl-bz', d: 'M300 99 H421', thin: true },
    { id: 'sl-br', d: 'M300 135 H421', thin: true },
    { id: 'sl-dek', d: 'M300 158 H325', thin: true },
    { id: 'br-dek', d: 'M421 134 V147', thin: true },
    { id: 'sl-op', d: 'M300 270 H343', thin: true },
    { id: 'sl-ac', d: 'M300 270 H417', thin: true },
    { id: 'sl-ar', d: 'M300 302 H392', thin: true },
    { id: 'sl-vgl', d: 'M300 334 H343', thin: true },
    { id: 'erg-ac', d: 'M417 334 H469 V278', thin: true },
    { id: 'erg-vgl', d: 'M380 334 H350', thin: true },
    { id: 'sl-aus', d: 'M300 437 H325', thin: true },
    { id: 'sl-ein', d: 'M300 475 H325', thin: true },
];
