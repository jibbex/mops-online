// @vitest-environment jsdom

import { usePlayer } from '@/player/player';
import { TOUR_STORAGE_KEY } from '@/tour/tour-storage';
import { useTour } from '@/tour/tour-store';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TourController } from './tour-controller';

describe('TourController', () => {
    beforeEach(() => {
        localStorage.removeItem(TOUR_STORAGE_KEY);
        usePlayer.getState().stop();
        useTour.setState({ stepId: null, started: false });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        usePlayer.getState().stop();
        useTour.setState({ stepId: null, started: false });
    });

    it('opens the tour after the first step', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().step();

        render(<TourController />);

        expect(useTour.getState().stepId).toBe('welcome');
        expect(useTour.getState().started).toBe(true);
    });

    it('does not open when the seen flag is set', () => {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
        usePlayer.getState().assemble();
        usePlayer.getState().step();

        render(<TourController />);

        expect(useTour.getState().stepId).toBeNull();
    });

    it('opens only once per page load when storage throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('Storage is blocked.');
        });

        usePlayer.getState().assemble();
        usePlayer.getState().step();

        render(<TourController />);

        expect(useTour.getState().stepId).toBe('welcome');

        useTour.getState().close();
        usePlayer.getState().step();

        expect(useTour.getState().stepId).toBeNull();
    });

    it('does not open in the idle state', () => {
        render(<TourController />);

        expect(useTour.getState().stepId).toBeNull();
    });

    it('does not open in the ready state', () => {
        usePlayer.getState().assemble();

        render(<TourController />);

        expect(useTour.getState().stepId).toBeNull();
    });

    it('does not open in the finished state', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().step();
        usePlayer.setState({ status: 'finished' });

        render(<TourController />);

        expect(useTour.getState().stepId).toBeNull();
    });
});
