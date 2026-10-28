/**
 * Von Neumann machine diagram.
 *
 * The SVG uses a fixed 520 x 510 design coordinate system so it scales without
 * measuring the container. Element IDs are the contract with the player's
 * visual mapping; changing an ID requires updating that mapping and its tests.
 *
 * @module components/vnr-diagram
 */

import type { CpuState } from '@/core/vm';
import { useI18n } from '@/i18n/i18n-context';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import { FLOW_DURATION_MS, packetDuration } from '@/player/timing';
import type { VisualState } from '@/player/visual-map';
import { useLayoutEffect, useRef, type ReactElement } from 'react';

interface VnrDiagramProps {
    readonly cpu: CpuState | null;
    readonly visual: VisualState;
    /** Monotonic event key used to restart packet movement. */
    readonly pulseKey: number;
    /** Time for one packet to traverse its route; zero hides packets. */
    readonly flowDurationMs: number;
}

const MEMORY_COLUMNS = [0, 1, 2];

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
    const memory = cpu?.memory ?? Array<number>(72).fill(0);
    const active = (id: string) => visual.active.has(id);

    return (
        <svg
            className="diagram-svg"
            viewBox="0 0 520 510"
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

            <BusLayer />

            <g
                className={cn(
                    'diagram-unit',
                    'unit-memory',
                    active('memory') && 'is-active',
                )}
            >
                <rect
                    className="unit-frame"
                    x="14"
                    y="27"
                    width="243"
                    height="464"
                    rx="2"
                />
                <rect
                    className="unit-head"
                    x="30"
                    y="43"
                    width="203.5"
                    height="32"
                    rx="1"
                />
                <text
                    className="diagram-title"
                    x="135"
                    y="14"
                    textAnchor="middle"
                >
                    {t('diagram.memoryUnit')}
                </text>
                <text
                    className="diagram-title"
                    x="131.75"
                    y="63"
                    textAnchor="middle"
                >
                    {t('diagram.memoryLogic')}
                </text>

                {MEMORY_COLUMNS.map((column) => (
                    <g key={column}>
                        <line
                            id={`mem-bar${column + 1}`}
                            className={cn(
                                'diagram-signal',
                                active(`mem-bar${column + 1}`) && 'is-active',
                            )}
                            x1={67 + column * 74}
                            y1="75"
                            x2={67 + column * 74}
                            y2="480"
                        />
                        {Array.from({ length: 24 }, (_, row) => {
                            const address = column * 24 + row;
                            const x = 48 + column * 74;
                            const y = 91 + row * 16;
                            const alias =
                                address >= 64
                                    ? String.fromCharCode(97 + address - 64)
                                    : '';

                            return (
                                <g
                                    key={address}
                                    id={`mem${formatAddress(address)}`}
                                    className={cn(
                                        'memory-cell',
                                        active(
                                            `mem${formatAddress(address)}`,
                                        ) && 'is-active',
                                    )}
                                >
                                    <rect
                                        x={x}
                                        y={y}
                                        width="37"
                                        height="16"
                                        rx="1"
                                    />
                                    <text
                                        className="diagram-label"
                                        x={x - 3}
                                        y={y + 11}
                                        textAnchor="end"
                                    >
                                        {formatAddress(address)}
                                    </text>
                                    <text
                                        className="diagram-text diagram-value"
                                        x={x + 18.5}
                                        y={y + 11}
                                        textAnchor="middle"
                                        fontSize="8"
                                    >
                                        {formatWord(memory[address] ?? 0)}
                                    </text>
                                    {alias ? (
                                        <text
                                            className="diagram-label"
                                            x={x + 42}
                                            y={y + 11}
                                        >
                                            {alias}
                                        </text>
                                    ) : null}
                                </g>
                            );
                        })}
                    </g>
                ))}
            </g>

            <g
                className={cn(
                    'diagram-unit',
                    'unit-control',
                    active('control') && 'is-active',
                )}
            >
                <rect
                    className="unit-frame"
                    x="309"
                    y="27"
                    width="180"
                    height="155"
                    rx="2"
                />
                <rect
                    className="unit-head"
                    x="325"
                    y="43"
                    width="148"
                    height="32"
                    rx="1"
                />
                <text
                    className="diagram-title"
                    x="399"
                    y="14"
                    textAnchor="middle"
                >
                    {t('diagram.controlUnit')}
                </text>
                <text
                    className="diagram-title"
                    x="399"
                    y="63"
                    textAnchor="middle"
                >
                    {t('diagram.controlLogic')}
                </text>

                <text className="diagram-label" x="325" y="100">
                    {t('diagram.instructionCounter')}
                </text>
                <g
                    id="bz"
                    className={cn(
                        'diagram-register',
                        active('bz') && 'is-active',
                    )}
                >
                    <rect x="421" y="91" width="19" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="430.5"
                        y="102"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatAddress(cpu?.bz ?? 0)}
                    </text>
                </g>

                <text className="diagram-label" x="325" y="127">
                    {t('diagram.instructionRegister')}
                </text>
                <g
                    id="br"
                    className={cn(
                        'diagram-register',
                        active('br') && 'is-active',
                    )}
                >
                    <rect x="421" y="118" width="19" height="16" rx="1" />
                    <rect x="440" y="118" width="37" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="430.5"
                        y="129"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatAddress(cpu?.br.opcode ?? 0)}
                    </text>
                    <text
                        className={cn(
                            'diagram-text diagram-value',
                            active('br-op') && 'diagram-active-text',
                        )}
                        x="458.5"
                        y="129"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatWord(cpu?.br.operand ?? 0)}
                    </text>
                </g>

                <text className="diagram-label" x="325" y="160">
                    {t('diagram.decoder')}
                </text>
                <g
                    id="dek"
                    className={cn(
                        'diagram-register',
                        active('dek') && 'is-active',
                    )}
                >
                    <rect x="325" y="147" width="148" height="23" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="330"
                        y="162"
                        fontSize="8"
                    >
                        {cpu?.decoded || '—'}
                    </text>
                </g>
            </g>

            <g
                className={cn(
                    'diagram-unit',
                    'unit-alu',
                    active('alu') && 'is-active',
                )}
            >
                <rect
                    className="unit-frame"
                    x="309"
                    y="230"
                    width="180"
                    height="138"
                    rx="2"
                />
                <text
                    className="diagram-title"
                    x="399"
                    y="220"
                    textAnchor="middle"
                >
                    {t('diagram.alu')}
                </text>

                <text className="diagram-label" x="343" y="257">
                    {t('diagram.operand')}
                </text>
                <g
                    id="op"
                    className={cn(
                        'diagram-register',
                        active('op') && 'is-active',
                    )}
                >
                    <rect x="343" y="262" width="37" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="361.5"
                        y="273"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatWord(cpu?.op ?? 0)}
                    </text>
                </g>

                <text className="diagram-label" x="417" y="257">
                    {t('diagram.accumulator')}
                </text>
                <g
                    id="ac"
                    className={cn(
                        'diagram-register',
                        active('ac') && 'is-active',
                    )}
                >
                    <rect x="417" y="262" width="37" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="435.5"
                        y="273"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatWord(cpu?.ac ?? 0)}
                    </text>
                </g>

                <polygon
                    className="diagram-triangle"
                    points="380.2,278.2 398.7,302.2 380.2,326.2 417.2,326.2 398.7,302.2 417.2,278.2"
                />
                <g
                    id="ar"
                    className={cn(
                        'diagram-register',
                        active('ar') && 'is-active',
                    )}
                >
                    <rect x="392" y="294" width="13" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="398.5"
                        y="305"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {cpu?.ar || '?'}
                    </text>
                </g>

                <text className="diagram-label" x="343" y="352">
                    {t('diagram.compare')}
                </text>
                <g
                    id="vgl"
                    className={cn(
                        'diagram-register',
                        active('vgl') && 'is-active',
                    )}
                >
                    <rect x="343" y="326" width="13" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="349.5"
                        y="337"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {cpu?.vgl || '—'}
                    </text>
                </g>

                <text className="diagram-label" x="380" y="352">
                    {t('diagram.result')}
                </text>
                <g
                    id="erg"
                    className={cn(
                        'diagram-register',
                        active('erg') && 'is-active',
                    )}
                >
                    <rect x="380" y="326" width="37" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="398.5"
                        y="337"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatWord(cpu?.erg ?? 0)}
                    </text>
                </g>
            </g>

            <g
                className={cn(
                    'diagram-unit',
                    'unit-io',
                    active('io') && 'is-active',
                )}
            >
                <text
                    className="diagram-title"
                    x="391"
                    y="400"
                    textAnchor="middle"
                >
                    {t('diagram.inputOutput')}
                </text>
                <rect
                    className="unit-frame"
                    x="309"
                    y="417"
                    width="165"
                    height="38.4"
                    rx="2"
                />
                <text className="diagram-label" x="367.5" y="437">
                    {t('diagram.outputRegister')}
                </text>
                <g
                    id="aus"
                    className={cn(
                        'diagram-register',
                        active('aus') && 'is-active',
                    )}
                >
                    <rect x="325" y="429" width="37" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="343.5"
                        y="440"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatWord(cpu?.aus ?? 0)}
                    </text>
                </g>

                <rect
                    className="unit-frame"
                    x="309"
                    y="456"
                    width="165"
                    height="38.4"
                    rx="2"
                />
                <text className="diagram-label" x="367.5" y="476">
                    {t('diagram.inputRegister')}
                </text>
                <g
                    id="ein"
                    className={cn(
                        'diagram-register',
                        active('ein') && 'is-active',
                    )}
                >
                    <rect x="325" y="467" width="37" height="16" rx="1" />
                    <text
                        className="diagram-text diagram-value"
                        x="343.5"
                        y="478"
                        textAnchor="middle"
                        fontSize="8"
                    >
                        {formatWord(cpu?.ein ?? 0)}
                    </text>
                </g>
            </g>

            <PacketLayer
                key={`${visual.transfer?.id ?? 'none'}-${pulseKey}`}
                transfer={visual.transfer}
                pulseKey={pulseKey}
                flowDurationMs={flowDurationMs}
            />
        </svg>
    );
}

/**
 * Renders the permanent bus and signal paths behind the machine units.
 *
 * @returns The bus layer element.
 */
function BusLayer(): ReactElement {
    const bus = (id: string, d: string, thin = false) => (
        <path
            key={id}
            id={id}
            d={d}
            className={thin ? 'diagram-signal' : 'diagram-bus'}
        />
    );

    return (
        <g>
            {bus('sl-trunk', 'M300 59 V480')}
            {bus('sl-mem', 'M257 59 H300')}
            {bus('sl-bz', 'M300 99 H421', true)}
            {bus('sl-br', 'M300 135 H421', true)}
            {bus('sl-dek', 'M300 158 H325', true)}
            {bus('br-dek', 'M421 134 V147', true)}
            {bus('sl-op', 'M300 270 H343', true)}
            {bus('sl-ac', 'M300 270 H417', true)}
            {bus('sl-ar', 'M300 302 H392', true)}
            {bus('sl-vgl', 'M300 334 H343', true)}
            {bus('erg-ac', 'M417 334 H469 V278', true)}
            {bus('erg-vgl', 'M380 334 H350', true)}
            {bus('sl-aus', 'M300 437 H325', true)}
            {bus('sl-ein', 'M300 475 H325', true)}
        </g>
    );
}

/**
 * Renders exactly one data packet that travels along the complete bus route.
 *
 * The packet starts at the source component edge and ends at the destination
 * component edge. It remains at the destination after the traversal and is
 * replaced only when the next micro-op produces a new route.
 *
 * @param transfer Active bus route, or null.
 * @param pulseKey Event key that restarts the packet motion.
 * @param flowDurationMs Time for one packet to traverse the route.
 * @returns The packet layer element.
 */
function PacketLayer({
    transfer,
    pulseKey,
    flowDurationMs,
}: {
    readonly transfer: VisualState['transfer'];
    readonly pulseKey: number;
    readonly flowDurationMs: number;
}): ReactElement | null {
    const motionRef = useRef<SVGAnimateMotionElement>(null);
    const pathRef = useRef<SVGPathElement>(null);

    useLayoutEffect(() => {
        const path = pathRef.current;
        const motion = motionRef.current;

        if (!path || !motion) {
            return;
        }

        const length = path.getTotalLength();
        const durationScale = flowDurationMs / FLOW_DURATION_MS;
        motion.setAttribute(
            'dur',
            `${packetDuration(length, durationScale)}ms`,
        );
        motion.beginElement();
    }, [pulseKey, transfer?.id, flowDurationMs]);

    if (!transfer || flowDurationMs <= 0) {
        return null;
    }

    return (
        <g className="diagram-packet-layer" data-transfer={transfer.id}>
            <path
                ref={pathRef}
                d={transfer.path}
                className="diagram-packet-measure"
            />
            <g className="diagram-packet" filter="url(#dataPacketGlow)">
                <circle
                    r={transfer.size === 'bus' ? 7 : 6}
                    fill="url(#dataPacketGradient)"
                    stroke="var(--diagram-packet-ring)"
                    strokeWidth="1"
                />
                <circle
                    cx={transfer.size === 'bus' ? -2.3 : -2}
                    cy={transfer.size === 'bus' ? -2.3 : -2}
                    r={transfer.size === 'bus' ? 1.3 : 1.1}
                    className="diagram-packet-core"
                />
                <animateMotion
                    ref={motionRef}
                    begin="indefinite"
                    dur={`${flowDurationMs}ms`}
                    path={transfer.path}
                    fill="freeze"
                />
            </g>
        </g>
    );
}
