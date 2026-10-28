/**
 * Data packet animation for one external bus transfer.
 *
 * @module components/vnr-packet-layer
 */

import { FLOW_DURATION_MS, packetDuration } from '@/player/timing';
import type { VisualState } from '@/player/visual-map';
import { useLayoutEffect, useRef, type ReactElement } from 'react';

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
export function VnrPacketLayer({
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
