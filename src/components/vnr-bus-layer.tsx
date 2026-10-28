/**
 * Permanent bus and signal paths behind the machine units.
 *
 * @module components/vnr-bus-layer
 */

import type { ReactElement } from 'react';
import { BUS_PATHS } from './vnr-layout';

/**
 * Renders the permanent bus and signal paths.
 *
 * @returns The bus layer element.
 */
export function VnrBusLayer(): ReactElement {
    return (
        <g>
            {BUS_PATHS.map((path) => (
                <path
                    key={path.id}
                    id={path.id}
                    d={path.d}
                    className={path.thin ? 'diagram-signal' : 'diagram-bus'}
                />
            ))}
        </g>
    );
}
