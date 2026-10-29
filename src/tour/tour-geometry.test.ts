// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
    computeScrimPanels,
    computeSpotlight,
    placeCard,
    TOUR_CARD_GAP_PX,
    TOUR_SPOTLIGHT_PADDING_PX,
    TOUR_VIEWPORT_MARGIN_PX,
    type Rect,
    type Size,
} from './tour-geometry';

const VIEWPORT: Size = { width: 1000, height: 800 };
const CARD: Size = { width: 300, height: 150 };

describe('computeSpotlight', () => {
    it('pads a normal target and rounds outward', () => {
        const target: Rect = {
            left: 10.2,
            top: 20.7,
            width: 30.4,
            height: 40.1,
        };

        expect(computeSpotlight(target, VIEWPORT)).toEqual({
            left: 4,
            top: 14,
            width: 43,
            height: 53,
        });
    });

    it('clamps the left and top edges to zero', () => {
        const target: Rect = {
            left: -20.4,
            top: -10.6,
            width: 50.2,
            height: 20.3,
        };

        expect(computeSpotlight(target, VIEWPORT)).toEqual({
            left: 0,
            top: 0,
            width: 36,
            height: 16,
        });
    });

    it('clamps the right and bottom edges to the viewport', () => {
        const target: Rect = {
            left: 980.2,
            top: 780.4,
            width: 30.5,
            height: 30.5,
        };

        expect(computeSpotlight(target, VIEWPORT)).toEqual({
            left: 974,
            top: 774,
            width: 26,
            height: 26,
        });
    });
});

describe('computeScrimPanels', () => {
    it('covers the viewport when there is no hole', () => {
        expect(computeScrimPanels(null, VIEWPORT)).toEqual([
            { left: 0, top: 0, width: 1000, height: 800 },
        ]);
    });

    it('returns top, bottom, left, and right panels around the hole', () => {
        const hole: Rect = { left: 100, top: 50, width: 200, height: 100 };

        expect(computeScrimPanels(hole, VIEWPORT)).toEqual([
            { left: 0, top: 0, width: 1000, height: 50 },
            { left: 0, top: 150, width: 1000, height: 650 },
            { left: 0, top: 50, width: 100, height: 100 },
            { left: 300, top: 50, width: 700, height: 100 },
        ]);
    });

    it('keeps zero-sized panels', () => {
        const hole: Rect = { left: 0, top: 0, width: 1000, height: 800 };

        expect(computeScrimPanels(hole, VIEWPORT)).toEqual([
            { left: 0, top: 0, width: 1000, height: 0 },
            { left: 0, top: 800, width: 1000, height: 0 },
            { left: 0, top: 0, width: 0, height: 800 },
            { left: 1000, top: 0, width: 0, height: 800 },
        ]);
    });
});

describe('placeCard', () => {
    it('places the card below when there is room', () => {
        const hole: Rect = { left: 400, top: 300, width: 100, height: 50 };

        expect(placeCard(hole, CARD, VIEWPORT)).toEqual({
            left: 300,
            top: 300 + 50 + TOUR_CARD_GAP_PX,
        });
    });

    it('places the card above a target near the bottom', () => {
        const hole: Rect = { left: 400, top: 600, width: 100, height: 50 };

        expect(placeCard(hole, CARD, VIEWPORT)).toEqual({
            left: 300,
            top: 600 - TOUR_CARD_GAP_PX - 150,
        });
    });

    it('places the card to the right of a tall target near the left', () => {
        const hole: Rect = { left: 50, top: 100, width: 400, height: 600 };

        expect(placeCard(hole, CARD, VIEWPORT)).toEqual({
            left: 50 + 400 + TOUR_CARD_GAP_PX,
            top: 100 + 300 - 75,
        });
    });

    it('places the card to the left of a tall target near the right', () => {
        const hole: Rect = { left: 600, top: 100, width: 350, height: 600 };

        expect(placeCard(hole, CARD, VIEWPORT)).toEqual({
            left: 600 - TOUR_CARD_GAP_PX - 300,
            top: 100 + 300 - 75,
        });
    });

    it('falls back below and clamps when no side fits', () => {
        const hole: Rect = { left: 100, top: 100, width: 800, height: 600 };

        expect(placeCard(hole, CARD, VIEWPORT)).toEqual({
            left: 350,
            top: 638,
        });
    });

    it('clamps the card at the left and right viewport edges', () => {
        const leftHole: Rect = { left: 0, top: 300, width: 20, height: 20 };
        const rightHole: Rect = {
            left: 980,
            top: 300,
            width: 20,
            height: 20,
        };

        expect(placeCard(leftHole, CARD, VIEWPORT).left).toBe(
            TOUR_VIEWPORT_MARGIN_PX,
        );
        expect(placeCard(rightHole, CARD, VIEWPORT).left).toBe(
            VIEWPORT.width - TOUR_VIEWPORT_MARGIN_PX - CARD.width,
        );
    });

    it('centers the card when there is no target', () => {
        expect(placeCard(null, CARD, VIEWPORT)).toEqual({
            left: 350,
            top: 325,
        });
    });
});

describe('tour geometry constants', () => {
    it('keeps the visual spacing stable', () => {
        expect(TOUR_SPOTLIGHT_PADDING_PX).toBe(6);
        expect(TOUR_CARD_GAP_PX).toBe(12);
        expect(TOUR_VIEWPORT_MARGIN_PX).toBe(12);
    });
});
