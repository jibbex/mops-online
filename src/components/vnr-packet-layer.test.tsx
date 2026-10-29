import type { TransferRoute } from '@/player/visual-map';
import { cleanup, render } from '@testing-library/react';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { VnrPacketLayer } from './vnr-packet-layer';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MOCK_PATH_LENGTH = 100;
const NORMAL_DURATION_MS = 1000;

const getTotalLength = vi.fn(() => MOCK_PATH_LENGTH);
const beginElement = vi.fn();

function svgPrototype(tag: string): object {
    const element = document.createElementNS(SVG_NAMESPACE, tag);
    const prototype = Object.getPrototypeOf(element) as unknown;

    if (prototype === null || typeof prototype !== 'object') {
        throw new Error(`SVG ${tag} has no prototype.`);
    }

    return prototype;
}

const TRANSFERS: readonly TransferRoute[] = [
    {
        id: 'memory-control',
        path: 'M265 59 H300 V158',
        size: 'bus',
    },
    {
        id: 'control-memory',
        path: 'M300 158 V59 H265',
        size: 'bus',
    },
    {
        id: 'input-control',
        path: 'M301 475 H300 V158',
        size: 'bus',
    },
    {
        id: 'control-ac',
        path: 'M300 158 V270',
        size: 'bus',
    },
    {
        id: 'ac-control',
        path: 'M300 270 V158',
        size: 'bus',
    },
    {
        id: 'control-op',
        path: 'M300 158 V270',
        size: 'bus',
    },
    {
        id: 'control-ar',
        path: 'M300 158 V302',
        size: 'bus',
    },
    {
        id: 'control-aus',
        path: 'M300 158 V437',
        size: 'bus',
    },
    {
        id: 'vgl-control',
        path: 'M300 334 V158',
        size: 'bus',
    },
    {
        id: 'signal-test',
        path: 'M300 200 H320',
        size: 'signal',
    },
];

beforeAll(() => {
    const pathPrototype = svgPrototype('path');
    const motionPrototype = svgPrototype('animateMotion');

    Object.defineProperty(pathPrototype, 'getTotalLength', {
        configurable: true,
        value: getTotalLength,
    });
    Object.defineProperty(motionPrototype, 'beginElement', {
        configurable: true,
        value: beginElement,
    });
});

beforeEach(() => {
    getTotalLength.mockClear();
    beginElement.mockClear();
});

afterEach(cleanup);

afterAll(() => {
    const pathPrototype = svgPrototype('path');
    const motionPrototype = svgPrototype('animateMotion');

    Reflect.deleteProperty(pathPrototype, 'getTotalLength');
    Reflect.deleteProperty(motionPrototype, 'beginElement');
});

describe('VnrPacketLayer', () => {
    it.each(TRANSFERS)('renders one packet for $id', (transfer) => {
        const { container } = render(
            <svg>
                <VnrPacketLayer
                    transfer={transfer}
                    pulseKey={1}
                    flowDurationMs={NORMAL_DURATION_MS}
                />
            </svg>,
        );
        const layer = container.querySelector('[data-transfer]');
        const circles = layer?.querySelectorAll('circle');
        const motion = layer?.querySelector('animateMotion');

        expect(layer).not.toBeNull();
        expect(layer).toHaveAttribute('data-transfer', transfer.id);
        expect(circles).toHaveLength(2);
        expect(circles?.[0]).toHaveAttribute(
            'r',
            transfer.size === 'bus' ? '7' : '6',
        );
        expect(circles?.[1]).toHaveAttribute(
            'r',
            transfer.size === 'bus' ? '1.3' : '1.1',
        );
        expect(motion).toHaveAttribute('path', transfer.path);
        expect(motion).toHaveAttribute('dur', '200ms');
        expect(beginElement).toHaveBeenCalledTimes(1);
    });

    it('renders nothing without a transfer', () => {
        const { container } = render(
            <svg>
                <VnrPacketLayer
                    transfer={null}
                    pulseKey={1}
                    flowDurationMs={NORMAL_DURATION_MS}
                />
            </svg>,
        );

        expect(container.querySelector('[data-transfer]')).toBeNull();
    });

    it('renders nothing when the flow duration is zero', () => {
        const transfer = TRANSFERS[0];

        if (!transfer) {
            throw new Error('Expected a transfer fixture.');
        }

        const { container } = render(
            <svg>
                <VnrPacketLayer
                    transfer={transfer}
                    pulseKey={1}
                    flowDurationMs={0}
                />
            </svg>,
        );

        expect(container.querySelector('[data-transfer]')).toBeNull();
    });
});
