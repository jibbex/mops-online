import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
import { TOUR_STORAGE_KEY } from '@/tour/tour-storage';
import { useTour } from '@/tour/tour-store';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TourButton } from './tour-button';

function renderButton() {
    render(
        <LanguageProvider>
            <TourButton />
        </LanguageProvider>,
    );
}

describe('TourButton', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
        usePlayer.getState().stop();
        useTour.setState({ stepId: null, started: false });
    });

    afterEach(() => {
        cleanup();
        usePlayer.getState().stop();
        useTour.setState({ stepId: null, started: false });
    });

    it('opens the tour at the first step', async () => {
        const user = userEvent.setup();

        renderButton();
        await user.click(screen.getByRole('button', { name: 'Guided tour' }));

        expect(useTour.getState().stepId).toBe('welcome');
        expect(useTour.getState().started).toBe(true);
    });
});
