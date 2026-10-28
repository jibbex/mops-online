/**
 * Memory unit of the von Neumann diagram.
 *
 * @module components/vnr-memory-unit
 */

import { DATA_START } from '@/core/object';
import { useI18n } from '@/i18n/i18n-context';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReactElement } from 'react';
import { MEMORY_COLUMNS } from './vnr-layout';

/**
 * Renders the memory unit and its 72 addressable cells.
 *
 * @param memory Complete memory image.
 * @param active Returns whether a diagram element is active.
 * @returns The memory unit element.
 */
export function VnrMemoryUnit({
    memory,
    active,
}: {
    readonly memory: readonly number[];
    readonly active: (id: string) => boolean;
}): ReactElement {
    const { t } = useI18n();

    return (
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
            <text className="diagram-title" x="135" y="14" textAnchor="middle">
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
                            address >= DATA_START
                                ? String.fromCharCode(97 + address - DATA_START)
                                : '';

                        return (
                            <g
                                key={address}
                                id={`mem${formatAddress(address)}`}
                                className={cn(
                                    'memory-cell',
                                    active(`mem${formatAddress(address)}`) &&
                                        'is-active',
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
    );
}
