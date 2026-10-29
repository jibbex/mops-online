import { LanguageProvider } from '@/i18n/i18n-provider';
import { openTour } from '@/tour/tour-actions';
import { TOUR_STORAGE_KEY } from '@/tour/tour-storage';
import { TOUR_STEPS } from '@/tour/tour-steps';
import { useTour } from '@/tour/tour-store';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TourOverlay } from './tour-overlay';

const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = 800;
const CARD_WIDTH = 300;
const CARD_HEIGHT = 150;

function domRect(
    left: number,
    top: number,
    width: number,
    height: number,
): DOMRect {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
    };
}

function addTarget(name: string, rect: DOMRect): HTMLElement {
    const target = document.createElement('div');

    target.dataset.tour = name;
    target.getBoundingClientRect = () => rect;
    document.body.append(target);

    return target;
}

async function renderOverlay(): Promise<void> {
    render(
        <LanguageProvider>
            <TourOverlay />
        </LanguageProvider>,
    );

    await waitFor(() => {
        expect(screen.getByTestId('tour-card')).toHaveClass(
            'data-open:animate-in',
        );
    });
}

function setCardRect(rect: DOMRect): void {
    screen.getByTestId('tour-card').getBoundingClientRect = () => rect;
    fireEvent(window, new Event('resize'));
}

function openStep(stepId: keyof typeof TOUR_STEPS): void {
    useTour.setState({ stepId, started: true });
}

describe('TourOverlay', () => {
    beforeEach(() => {
        localStorage.clear();
        useTour.setState({ stepId: null, started: false });
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: VIEWPORT_WIDTH,
        });
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: VIEWPORT_HEIGHT,
        });
    });

    afterEach(() => {
        cleanup();
        document
            .querySelectorAll('[data-tour], [data-tour-trigger]')
            .forEach((element) => element.remove());
        useTour.setState({ stepId: null, started: false });
    });

    it('renders nothing when the tour is closed', () => {
        render(
            <LanguageProvider>
                <TourOverlay />
            </LanguageProvider>,
        );

        expect(screen.queryByTestId('tour')).not.toBeInTheDocument();
    });

    it('shows one scrim and a centered card for the welcome step', async () => {
        openStep('welcome');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        expect(screen.getAllByTestId('tour-scrim')).toHaveLength(1);
        expect(screen.queryByTestId('tour-ring')).not.toBeInTheDocument();
        expect(screen.getByTestId('tour-card')).toHaveStyle({
            left: '350px',
            top: '325px',
        });
        expect(screen.getByTestId('tour-card')).toHaveAttribute(
            'data-state',
            'open',
        );
        expect(screen.getByTestId('tour-card')).toHaveClass(
            'data-open:animate-in',
            'data-open:fade-in-0',
            'data-open:zoom-in-95',
        );
        expect(screen.getByTestId('tour')).toHaveClass(
            'data-open:animate-in',
            'data-open:fade-in-0',
        );
    });

    it('shows four scrims, a ring, and a card for a target step', async () => {
        addTarget('pc', domRect(400, 300, 100, 50));
        openStep('read');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        expect(screen.getAllByTestId('tour-scrim')).toHaveLength(4);
        expect(screen.getByTestId('tour-ring')).toHaveStyle({
            left: '394px',
            top: '294px',
            width: '112px',
            height: '62px',
        });
        expect(screen.getByTestId('tour-card')).toHaveStyle({
            left: '300px',
            top: '368px',
        });
    });

    it('falls back to a centered card when the target is missing', async () => {
        openStep('read');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        expect(screen.getAllByTestId('tour-scrim')).toHaveLength(1);
        expect(screen.queryByTestId('tour-ring')).not.toBeInTheDocument();
        expect(screen.getByTestId('tour-card')).toHaveStyle({
            left: '350px',
            top: '325px',
        });
    });

    it('walks all six steps and closes on Done', async () => {
        const user = userEvent.setup();
        const titles = [
            'The machine',
            'Active unit',
            'Read',
            'Write',
            'Increment',
            'Data packet',
        ];

        openStep('welcome');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        for (const [index, title] of titles.entries()) {
            expect(
                screen.getByRole('heading', { name: title }),
            ).toBeInTheDocument();
            expect(
                screen.getByText(`Step ${index + 1} of 6`),
            ).toBeInTheDocument();

            if (index === titles.length - 1) {
                await user.click(screen.getByRole('button', { name: 'Done' }));
            } else {
                await user.click(screen.getByRole('button', { name: 'Next' }));
            }
        }

        const root = screen.queryByTestId('tour');

        if (root) {
            fireEvent.animationEnd(root);
        }

        await waitFor(() => {
            expect(screen.queryByTestId('tour')).not.toBeInTheDocument();
        });
        expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    });

    it('disables Back on the first step and works on later steps', async () => {
        const user = userEvent.setup();

        openStep('welcome');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

        await user.click(screen.getByRole('button', { name: 'Next' }));
        expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('heading', { name: 'The machine' }),
        ).toBeInTheDocument();
    });

    it('skips and writes the seen flag', async () => {
        const user = userEvent.setup();

        openStep('welcome');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        await user.click(screen.getByRole('button', { name: 'Skip tour' }));

        const root = screen.queryByTestId('tour');

        if (root) {
            fireEvent.animationEnd(root);
        }

        await waitFor(() => {
            expect(screen.queryByTestId('tour')).not.toBeInTheDocument();
        });
        expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    });

    it('hides Skip on the last step', async () => {
        openStep('bus');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        expect(
            screen.queryByRole('button', { name: 'Skip tour' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Done' }),
        ).toBeInTheDocument();
    });

    it('closes on Escape and ignores other keys', async () => {
        openStep('welcome');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        fireEvent.keyDown(window, { key: 'a' });
        expect(screen.getByTestId('tour')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });

        const root = screen.queryByTestId('tour');

        if (root) {
            fireEvent.animationEnd(root);
        }

        await waitFor(() => {
            expect(screen.queryByTestId('tour')).not.toBeInTheDocument();
        });
    });

    it('focuses the primary button on every step', async () => {
        const user = userEvent.setup();

        openStep('welcome');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        const titles = [
            'The machine',
            'Active unit',
            'Read',
            'Write',
            'Increment',
            'Data packet',
        ];

        for (const [index, title] of titles.entries()) {
            expect(screen.getByRole('heading', { name: title })).toBeVisible();

            await waitFor(() => {
                expect(
                    screen.getByRole('button', {
                        name: index === titles.length - 1 ? 'Done' : 'Next',
                    }),
                ).toHaveFocus();
            });

            if (index < titles.length - 1) {
                await user.click(screen.getByRole('button', { name: 'Next' }));
            }
        }
    });

    it('recomputes the card position on resize', async () => {
        const target = addTarget('pc', domRect(400, 300, 100, 50));

        openStep('read');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        expect(screen.getByTestId('tour-card')).toHaveStyle({ top: '368px' });

        target.getBoundingClientRect = () => domRect(400, 500, 100, 50);
        fireEvent(window, new Event('resize'));

        expect(screen.getByTestId('tour-card')).toHaveStyle({ top: '568px' });
    });

    it('returns focus to the trigger when the tour closes', async () => {
        const trigger = document.createElement('button');

        trigger.type = 'button';
        trigger.dataset.tourTrigger = 'true';
        trigger.textContent = 'Trigger';
        document.body.append(trigger);
        trigger.focus();
        openTour();

        await renderOverlay();

        act(() => {
            useTour.setState({ stepId: null });
        });

        await waitFor(() => {
            expect(trigger).toHaveFocus();
        });
    });

    it('renders German text with the German language provider', async () => {
        localStorage.setItem('mops-language', 'de');
        openStep('welcome');
        await renderOverlay();
        setCardRect(domRect(0, 0, CARD_WIDTH, CARD_HEIGHT));

        expect(
            screen.getByRole('heading', { name: 'Der Rechner' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Schritt 1 von 6')).toBeInTheDocument();
    });
});
