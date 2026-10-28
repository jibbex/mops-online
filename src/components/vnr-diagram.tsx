/**
 * Von Neumann machine diagram.
 *
 * The diagram uses a fixed design coordinate system so it scales without
 * measuring the container. Element IDs are the contract with the player's
 * visual mapping; changing an ID requires updating that mapping and its tests.
 *
 * @module components/vnr-diagram
 */

import { MEMORY_SIZE } from '@/core/object';
import type { CpuState } from '@/core/vm';
import { useI18n } from '@/i18n/i18n-context';
import type { VisualState } from '@/player/visual-map';
import type { ReactElement } from 'react';
import { VnrAluUnit } from './vnr-alu-unit';
import { VnrBusLayer } from './vnr-bus-layer';
import { VnrControlUnit } from './vnr-control-unit';
import { VnrIoUnit } from './vnr-io-unit';
import { VNR_VIEW_BOX } from './vnr-layout';
import { VnrMemoryUnit } from './vnr-memory-unit';
import { VnrPacketLayer } from './vnr-packet-layer';

interface VnrDiagramProps {
    readonly cpu: CpuState | null;
    readonly visual: VisualState;
    /** Monotonic event key used to restart packet movement. */
    readonly pulseKey: number;
    /** Time for one packet to traverse its route; zero hides packets. */
    readonly flowDurationMs: number;
}

/**
 * Renders the machine diagram from the current CPU and visual state.
 *
 * @param cpu Current CPU state, or null before assembly.
 * @param visual Active diagram elements derived from the last event.
 * @param pulseKey Monotonic event key used to restart packet movement.
 * @param flowDurationMs Time for one packet to traverse its route.
 * @returns The SVG diagram element.
 */
export function VnrDiagram({
    cpu,
    visual,
    pulseKey,
    flowDurationMs,
}: VnrDiagramProps): ReactElement {
    const { t } = useI18n();
    const memory = cpu?.memory ?? Array<number>(MEMORY_SIZE).fill(0);
    const active = (id: string) => visual.active.has(id);

    return (
        <svg
            className="diagram-svg"
            viewBox={VNR_VIEW_BOX}
            role="img"
            aria-label={t('diagram.title')}
            aria-describedby="vnr-description"
        >
            <desc id="vnr-description">{t('diagram.description')}</desc>

            <defs>
                <radialGradient
                    id="dataPacketGradient"
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fx="34%"
                    fy="28%"
                >
                    <stop
                        offset="0%"
                        stopColor="var(--diagram-packet-core)"
                        stopOpacity="1"
                    />
                    <stop
                        offset="35%"
                        stopColor="var(--diagram-packet)"
                        stopOpacity="1"
                    />
                    <stop
                        offset="100%"
                        stopColor="var(--diagram-packet-deep)"
                        stopOpacity="1"
                    />
                </radialGradient>
                <filter
                    id="dataPacketGlow"
                    x="-150%"
                    y="-150%"
                    width="400%"
                    height="400%"
                >
                    <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="2.6"
                        floodColor="var(--diagram-packet)"
                        floodOpacity="0.8"
                    />
                </filter>
            </defs>

            <VnrBusLayer />
            <VnrMemoryUnit memory={memory} active={active} />
            <VnrControlUnit cpu={cpu} active={active} />
            <VnrAluUnit cpu={cpu} active={active} />
            <VnrIoUnit cpu={cpu} active={active} />
            <VnrPacketLayer
                key={`${visual.transfer?.id ?? 'none'}-${pulseKey}`}
                transfer={visual.transfer}
                pulseKey={pulseKey}
                flowDurationMs={flowDurationMs}
            />
        </svg>
    );
}
