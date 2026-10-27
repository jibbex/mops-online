import type { CpuState } from '@/core/vm';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { VisualState } from '@/player/visualMap';

interface VnrDiagramProps {
    readonly cpu: CpuState | null;
    readonly visual: VisualState;
}

const MEMORY_COLUMNS = [0, 1, 2];

export function VnrDiagram({ cpu, visual }: VnrDiagramProps) {
    const memory = cpu?.memory ?? Array<number>(72).fill(0);
    const isActive = (id: string) => visual.active.has(id);

    return (
        <svg
            className="diagram-svg"
            viewBox="0 0 1000 760"
            role="img"
            aria-labelledby="vnr-title vnr-description"
        >
            <title id="vnr-title">MOPS von Neumann machine</title>
            <desc id="vnr-description">
                Memory, control unit, ALU, and input/output unit with live
                register and bus states.
            </desc>

            <BusLayer visual={visual} />

            <g
                id="memory"
                className={cn(
                    'diagram-unit',
                    isActive('memory') && 'is-active',
                )}
            >
                <rect
                    className="unit-frame"
                    x="24"
                    y="64"
                    width="366"
                    height="660"
                    rx="8"
                />
                <rect
                    className="unit-head"
                    x="24"
                    y="64"
                    width="366"
                    height="30"
                    rx="8"
                />
                <text
                    className="diagram-title"
                    x="207"
                    y="84"
                    textAnchor="middle"
                >
                    MEMORY UNIT
                </text>
                <text
                    className="diagram-label"
                    x="207"
                    y="116"
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
                                isActive(`mem-bar${column + 1}`) && 'is-active',
                            )}
                            x1={62 + column * 108}
                            y1="126"
                            x2={62 + column * 108}
                            y2="664"
                        />
                        {Array.from({ length: 24 }, (_, row) => {
                            const address = column * 24 + row;
                            const x = 70 + column * 108;
                            const y = 132 + row * 22;
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
                                        isActive(
                                            `mem${formatAddress(address)}`,
                                        ) && 'is-active',
                                    )}
                                >
                                    <rect
                                        x={x}
                                        y={y}
                                        width="44"
                                        height="20"
                                        rx="2"
                                    />
                                    <text
                                        className="diagram-label"
                                        x={x - 6}
                                        y={y + 14}
                                        textAnchor="end"
                                    >
                                        {formatAddress(address)}
                                    </text>
                                    <text
                                        className="diagram-text diagram-value"
                                        x={x + 22}
                                        y={y + 14}
                                        textAnchor="middle"
                                        fontSize="10"
                                    >
                                        {formatWord(memory[address] ?? 0)}
                                    </text>
                                    {alias ? (
                                        <text
                                            className="diagram-label"
                                            x={x + 50}
                                            y={y + 14}
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
                id="control"
                className={cn(
                    'diagram-unit',
                    isActive('control') && 'is-active',
                )}
            >
                <rect
                    className="unit-frame"
                    x="432"
                    y="64"
                    width="540"
                    height="250"
                    rx="8"
                />
                <rect
                    className="unit-head"
                    x="432"
                    y="64"
                    width="540"
                    height="30"
                    rx="8"
                />
                <text
                    className="diagram-title"
                    x="702"
                    y="84"
                    textAnchor="middle"
                >
                    CONTROL UNIT
                </text>

                <Register
                    id="bz"
                    label="BZ"
                    value={formatAddress(cpu?.bz ?? 0)}
                    active={isActive('bz')}
                    x={452}
                    y={122}
                    width={104}
                />
                <Register
                    id="br"
                    label="BR"
                    value={`${formatAddress(cpu?.br.opcode ?? 0)} ${formatWord(
                        cpu?.br.operand ?? 0,
                    )}`}
                    active={isActive('br')}
                    x={592}
                    y={122}
                    width={228}
                />
                <text
                    className={cn(
                        'diagram-value',
                        isActive('br-op') && 'diagram-active-text',
                    )}
                    x={592}
                    y={187}
                    fontSize="10"
                >
                    operand {formatWord(cpu?.br.operand ?? 0)}
                </text>
                <Register
                    id="dek"
                    label="DECODER"
                    value={cpu?.decoded || '—'}
                    active={isActive('dek')}
                    x={452}
                    y={206}
                    width={368}
                />
            </g>

            <g
                id="alu"
                className={cn('diagram-unit', isActive('alu') && 'is-active')}
            >
                <rect
                    className="unit-frame"
                    x="432"
                    y="338"
                    width="540"
                    height="248"
                    rx="8"
                />
                <rect
                    className="unit-head"
                    x="432"
                    y="338"
                    width="540"
                    height="30"
                    rx="8"
                />
                <text
                    className="diagram-title"
                    x="702"
                    y="358"
                    textAnchor="middle"
                >
                    ALU
                </text>

                <Register
                    id="op"
                    label="OP"
                    value={formatWord(cpu?.op ?? 0)}
                    active={isActive('op')}
                    x={452}
                    y={390}
                    width={112}
                />
                <Register
                    id="ac"
                    label="AC"
                    value={formatWord(cpu?.ac ?? 0)}
                    active={isActive('ac')}
                    x={620}
                    y={390}
                    width={112}
                />
                <polygon
                    className="diagram-alu"
                    points="560,456 650,456 605,508"
                    fill="var(--diagram-alu)"
                    stroke="var(--diagram-border)"
                    strokeWidth="1.5"
                />
                <text
                    className="diagram-label"
                    x="605"
                    y="482"
                    textAnchor="middle"
                >
                    ALU
                </text>

                <Register
                    id="ar"
                    label="AR"
                    value={cpu?.ar || '?'}
                    active={isActive('ar')}
                    x={452}
                    y={520}
                    width={92}
                />
                <Register
                    id="erg"
                    label="ERG"
                    value={formatWord(cpu?.erg ?? 0)}
                    active={isActive('erg')}
                    x={574}
                    y={520}
                    width={112}
                />
                <Register
                    id="vgl"
                    label="VGL"
                    value={cpu?.vgl || '—'}
                    active={isActive('vgl')}
                    x={720}
                    y={520}
                    width={92}
                />
            </g>

            <g
                id="io"
                className={cn('diagram-unit', isActive('io') && 'is-active')}
            >
                <rect
                    className="unit-frame"
                    x="432"
                    y="610"
                    width="540"
                    height="114"
                    rx="8"
                />
                <rect
                    className="unit-head"
                    x="432"
                    y="610"
                    width="540"
                    height="30"
                    rx="8"
                />
                <text
                    className="diagram-title"
                    x="702"
                    y="630"
                    textAnchor="middle"
                >
                    INPUT / OUTPUT
                </text>

                <Register
                    id="aus"
                    label="AUS"
                    value={formatWord(cpu?.aus ?? 0)}
                    active={isActive('aus')}
                    x={462}
                    y={654}
                    width={150}
                />
                <Register
                    id="ein"
                    label="EIN"
                    value={formatWord(cpu?.ein ?? 0)}
                    active={isActive('ein')}
                    x={680}
                    y={654}
                    width={150}
                />
            </g>
        </svg>
    );
}

function BusLayer({ visual }: { readonly visual: VisualState }) {
    const active = (id: string) => visual.active.has(id);
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
            {bus('sl', 'M410 100 V700')}
            {bus('sl-mem', 'M390 108 H432', true)}
            {bus('sl-bz', 'M452 142 H410', true)}
            {bus('sl-br', 'M592 142 H410', true)}
            {bus('sl-dek', 'M452 226 H410', true)}
            {bus('sl-rw', 'M410 314 V338', true)}
            {bus('sl-op', 'M508 390 V378 H410', true)}
            {bus('sl-ac', 'M676 390 V378 H410', true)}
            {bus('sl-ar', 'M498 520 V566 H410', true)}
            {bus('sl-vgl', 'M766 520 V566 H410', true)}
            {bus('erg-ac', 'M630 520 V456 H676 V432', true)}
            {bus('erg-vgl', 'M630 520 V566 H766 V562', true)}
            {bus('sl-ea', 'M410 586 V610', true)}
            {bus('sl-aus', 'M410 654 H462', true)}
            {bus('sl-ein', 'M410 674 H680', true)}
        </g>
    );
}

interface RegisterProps {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly active: boolean;
    readonly x: number;
    readonly y: number;
    readonly width: number;
}

function Register({ id, label, value, active, x, y, width }: RegisterProps) {
    return (
        <g id={id} className={cn('diagram-register', active && 'is-active')}>
            <rect x={x} y={y} width={width} height="38" rx="4" />
            <text className="diagram-label" x={x + 8} y={y - 5}>
                {label}
            </text>
            <text
                className="diagram-text diagram-value"
                x={x + 8}
                y={y + 24}
                fontSize="13"
            >
                {value}
            </text>
        </g>
    );
}
