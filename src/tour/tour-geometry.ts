/**
 * Geometry helpers for the guided tour spotlight and card placement.
 *
 * The tour works in viewport pixels. Keeping the calculations pure makes the
 * edge cases testable without a browser layout.
 *
 * @module tour/tour-geometry
 */

/** Padding around the highlighted element so its outline stays visible. */
export const TOUR_SPOTLIGHT_PADDING_PX = 6;

/** Distance between the spotlight hole and the tour card. */
export const TOUR_CARD_GAP_PX = 12;

/** Minimum distance between the card and the viewport edges. */
export const TOUR_VIEWPORT_MARGIN_PX = 12;

export interface Rect {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}

export interface Size {
    readonly width: number;
    readonly height: number;
}

export interface Point {
    readonly left: number;
    readonly top: number;
}

/**
 * Pads a target rectangle and clamps it to the viewport.
 *
 * Edges are rounded outward so fractional browser rectangles never clip a
 * highlighted border.
 *
 * @param target Target rectangle in viewport pixels.
 * @param viewport Viewport size.
 * @returns The spotlight hole.
 */
export function computeSpotlight(target: Rect, viewport: Size): Rect {
    const left = clamp(
        Math.floor(target.left - TOUR_SPOTLIGHT_PADDING_PX),
        viewport.width,
    );
    const top = clamp(
        Math.floor(target.top - TOUR_SPOTLIGHT_PADDING_PX),
        viewport.height,
    );
    const right = clamp(
        Math.ceil(target.left + target.width + TOUR_SPOTLIGHT_PADDING_PX),
        viewport.width,
    );
    const bottom = clamp(
        Math.ceil(target.top + target.height + TOUR_SPOTLIGHT_PADDING_PX),
        viewport.height,
    );

    return {
        left,
        top,
        width: right - left,
        height: bottom - top,
    };
}

/**
 * Splits the viewport into four scrim panels around the spotlight hole.
 *
 * Zero-sized panels are kept so the overlay always has one panel per side.
 *
 * @param hole Spotlight hole, or null to cover the whole viewport.
 * @param viewport Viewport size.
 * @returns Panels in top, bottom, left, right order.
 */
export function computeScrimPanels(
    hole: Rect | null,
    viewport: Size,
): readonly Rect[] {
    if (hole === null) {
        return [
            {
                left: 0,
                top: 0,
                width: viewport.width,
                height: viewport.height,
            },
        ];
    }

    const holeBottom = hole.top + hole.height;
    const holeRight = hole.left + hole.width;

    return [
        { left: 0, top: 0, width: viewport.width, height: hole.top },
        {
            left: 0,
            top: holeBottom,
            width: viewport.width,
            height: viewport.height - holeBottom,
        },
        { left: 0, top: hole.top, width: hole.left, height: hole.height },
        {
            left: holeRight,
            top: hole.top,
            width: viewport.width - holeRight,
            height: hole.height,
        },
    ];
}

/**
 * Places the card next to the hole, preferring below, above, right, and left.
 *
 * @param hole Spotlight hole, or null to center the card.
 * @param card Card size.
 * @param viewport Viewport size.
 * @returns The card's top-left corner.
 */
export function placeCard(
    hole: Rect | null,
    card: Size,
    viewport: Size,
): Point {
    if (hole === null) {
        return clampPoint(
            {
                left: (viewport.width - card.width) / 2,
                top: (viewport.height - card.height) / 2,
            },
            card,
            viewport,
        );
    }

    const centeredLeft = hole.left + hole.width / 2 - card.width / 2;
    const belowTop = hole.top + hole.height + TOUR_CARD_GAP_PX;
    const below = {
        left: centeredLeft,
        top: belowTop,
    };

    if (belowTop + card.height <= viewport.height - TOUR_VIEWPORT_MARGIN_PX) {
        return clampPoint(below, card, viewport);
    }

    const aboveTop = hole.top - TOUR_CARD_GAP_PX - card.height;

    if (aboveTop >= TOUR_VIEWPORT_MARGIN_PX) {
        return clampPoint(
            { left: centeredLeft, top: aboveTop },
            card,
            viewport,
        );
    }

    const centeredTop = hole.top + hole.height / 2 - card.height / 2;
    const rightLeft = hole.left + hole.width + TOUR_CARD_GAP_PX;

    if (rightLeft + card.width <= viewport.width - TOUR_VIEWPORT_MARGIN_PX) {
        return clampPoint(
            { left: rightLeft, top: centeredTop },
            card,
            viewport,
        );
    }

    const leftLeft = hole.left - TOUR_CARD_GAP_PX - card.width;

    if (leftLeft >= TOUR_VIEWPORT_MARGIN_PX) {
        return clampPoint({ left: leftLeft, top: centeredTop }, card, viewport);
    }

    return clampPoint(below, card, viewport);
}

function clamp(value: number, maximum: number): number {
    return Math.min(Math.max(value, 0), maximum);
}

function clampPoint(point: Point, card: Size, viewport: Size): Point {
    return {
        left: clampToViewport(point.left, card.width, viewport.width),
        top: clampToViewport(point.top, card.height, viewport.height),
    };
}

function clampToViewport(
    value: number,
    size: number,
    available: number,
): number {
    const limit = Math.max(
        TOUR_VIEWPORT_MARGIN_PX,
        available - TOUR_VIEWPORT_MARGIN_PX - size,
    );

    return Math.min(Math.max(value, TOUR_VIEWPORT_MARGIN_PX), limit);
}
