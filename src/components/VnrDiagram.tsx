/**
 * Von Neumann machine diagram.
 *
 * The SVG uses a fixed 520 x 510 design coordinate system so it scales without
 * measuring the container. Element IDs are the contract with the player's
 * visual mapping; changing an ID requires updating that mapping and its tests.
 *
 * @module components/VnrDiagram
 */

import type { CpuState } from '@/core/vm';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { VisualState } from '@/player/visualMap';
import type { ReactElement } from 'react';

interface VnrDiagramProps {
    readonly cpu: CpuState | null;
    readonly visual: VisualState;
}

const MEMORY_COLUMNS = [0, 1, 2];

/**
 * Renders the machine diagram from the current CPU and visual state.
 *
 * @param cpu Current CPU state, or null before assembly.
 * @param visual Active diagram elements derived from the last event.
 * @returns The SVG diagram element.
 */
export function VnrDiagram({ cpu, visual }: VnrDiagramProps): ReactElement {
    const memory = cpu?.memory ?? Array<number>(72).fill(0);
    const active = (id: string) => visual.active.has(id);

    return (
        <svg
            className="diagram-svg"
            viewBox="0 0 520 510"
            role="img"
            aria-labelledby="vnr-title vnr-description"
        >
            <title id="vnr-title">MOPS von Neumann machine</title>
            <desc id="vnr-description">
                Memory, control unit, ALU, and input/output unit with live
                register and bus states.
            </desc>

            <BusLayer active={active} />

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
                    MEMORY UNIT
                </text>
                <text
                    className="diagram-title"
                    x="131.75"
                    y="63"
                    textAnchor="middle"
                >
                    MEMORY LOGIC
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
                                        fontSize="7"
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
                    CONTROL UNIT
                </text>
                <text
                    className="diagram-title"
                    x="399"
                    y="63"
                    textAnchor="middle"
                >
                    CONTROL LOGIC
                </text>

                <text className="diagram-label" x="325" y="100">
                    INSTRUCTION COUNTER
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
                        fontSize="7"
                    >
                        {formatAddress(cpu?.bz ?? 0)}
                    </text>
                </g>

                <text className="diagram-label" x="325" y="127">
                    INSTRUCTION REGISTER
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
                        fontSize="7"
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
                        fontSize="7"
                    >
                        {formatWord(cpu?.br.operand ?? 0)}
                    </text>
                </g>

                <text className="diagram-label" x="325" y="160">
                    DECODER
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
                        fontSize="7"
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
                    ALU
                </text>

                <text className="diagram-label" x="343" y="260">
                    OPERAND
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
                        fontSize="7"
                    >
                        {formatWord(cpu?.op ?? 0)}
                    </text>
                </g>

                <text className="diagram-label" x="417" y="260">
                    ACCUMULATOR
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
                        fontSize="7"
                    >
                        {formatWord(cpu?.ac ?? 0)}
                    </text>
                </g>

                <polygon
                    className="diagram-triangle"
                    points="380.2,278.2 398.7,302.2 380.2,326.2 417.2,326.2 398.7,302.2 417.2,278.2"
                />
                <text className="diagram-label" x="414" y="318">
                    ALU
                </text>

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
                        fontSize="7"
                    >
                        {cpu?.ar || '?'}
                    </text>
                </g>

                <text className="diagram-label" x="343" y="347">
                    COMPARE
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
                        fontSize="7"
                    >
                        {cpu?.vgl || '—'}
                    </text>
                </g>

                <text className="diagram-label" x="380" y="347">
                    RESULT
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
                        fontSize="7"
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
                    INPUT / OUTPUT
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
                    OUTPUT REGISTER
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
                        fontSize="7"
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
                    INPUT REGISTER
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
                        fontSize="7"
                    >
                        {formatWord(cpu?.ein ?? 0)}
                    </text>
                </g>
            </g>
        </svg>
    );
}

/**
 * Renders the bus and signal paths behind the machine units.
 *
 * @param active Tests whether a diagram element is active.
 * @returns The bus layer element.
 */
function BusLayer({
    active,
}: {
    readonly active: (id: string) => boolean;
}): ReactElement {
    const bus = (id: string, d: string, thin = false) => (
        <path
            id={id}
            d={d}
            className={cn(
                thin ? 'diagram-signal' : 'diagram-bus',
                active(id) && 'is-active',
            )}
        />
    );

    return (
        <g>
            {bus('sl', 'M300 59 V480')}
            {bus('sl-mem', 'M257 59 H300')}
            {bus('sl-bz', 'M300 99 H421', true)}
            {bus('sl-br', 'M300 135 H421', true)}
            {bus('sl-dek', 'M300 158 H325', true)}
            {bus('br-dek', 'M421 134 V147', true)}
            {bus('sl-rw', 'M300 182 V230')}
            {bus('sl-op', 'M300 270 H343', true)}
            {bus('sl-ac', 'M300 270 H417', true)}
            {bus('sl-ar', 'M300 302 H392', true)}
            {bus('sl-vgl', 'M300 334 H343', true)}
            {bus('erg-ac', 'M417 334 H469 V278', true)}
            {bus('erg-vgl', 'M380 334 H350', true)}
            {bus('sl-ea', 'M300 350 V456')}
            {bus('sl-aus', 'M300 437 H325', true)}
            {bus('sl-ein', 'M300 475 H325', true)}
        </g>
    );
}
