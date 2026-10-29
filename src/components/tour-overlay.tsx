/**
 * Guided tour overlay.
 *
 * The overlay is rendered next to the application shell, not inside it. Its
 * scrim panels dim and blur everything except the current target, while the
 * card explains the diagram markers. Radix Presence keeps the overlay mounted
 * through the same enter and exit animations as the import/export dialog.
 *
 * @module components/tour-overlay
 */

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-context';
import { cn } from '@/lib/utils';
import {
    computeScrimPanels,
    computeSpotlight,
    placeCard,
    type Point,
    type Rect,
} from '@/tour/tour-geometry';
import {
    TOUR_STEPS,
    TOUR_STEP_COUNT,
    type TourStepId,
} from '@/tour/tour-steps';
import { useTour } from '@/tour/tour-store';
import { Presence } from '@radix-ui/react-presence';
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactElement,
} from 'react';

interface TourLayout {
    readonly hole: Rect | null;
    readonly point: Point;
}

const INITIAL_LAYOUT: TourLayout = {
    hole: null,
    point: { left: 0, top: 0 },
};

type TourVisibility = 'open' | 'closed';

/**
 * Renders the tour when a step is open and keeps it mounted for the exit
 * animation before unmounting.
 */
export function TourOverlay(): ReactElement | null {
    const stepId = useTour((state) => state.stepId);
    const [lastStepId, setLastStepId] = useState<TourStepId | null>(stepId);

    useEffect(() => {
        if (stepId !== null) {
            setLastStepId(stepId);
        }
    }, [stepId]);

    const displayStepId = stepId ?? lastStepId;

    if (displayStepId === null) {
        return null;
    }

    const present = stepId !== null;

    return (
        <Presence present={present}>
            <div
                data-testid="tour"
                data-state={present ? 'open' : 'closed'}
                className="pointer-events-none fixed inset-0 z-[60] duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            >
                <TourContent
                    stepId={displayStepId}
                    visibility={present ? 'open' : 'closed'}
                />
            </div>
        </Presence>
    );
}

function TourContent({
    stepId,
    visibility,
}: {
    readonly stepId: TourStepId;
    readonly visibility: TourVisibility;
}): ReactElement {
    const { language, t } = useI18n();
    const next = useTour((state) => state.next);
    const back = useTour((state) => state.back);
    const close = useTour((state) => state.close);
    const cardRef = useRef<HTMLDivElement>(null);
    const primaryRef = useRef<HTMLButtonElement>(null);
    const [layout, setLayout] = useState<TourLayout>(INITIAL_LAYOUT);
    const [measured, setMeasured] = useState(false);
    const [animate, setAnimate] = useState(false);
    const step = TOUR_STEPS[stepId];
    const targetSelector = step.target;

    useLayoutEffect(() => {
        const measure = (): void => {
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
            };
            const target =
                targetSelector === null
                    ? null
                    : document.querySelector(`[data-tour="${targetSelector}"]`);
            const hole =
                target === null
                    ? null
                    : computeSpotlight(
                          target.getBoundingClientRect(),
                          viewport,
                      );
            const card = cardRef.current as HTMLDivElement;
            const cardSize = card.getBoundingClientRect();

            setLayout({
                hole,
                point: placeCard(hole, cardSize, viewport),
            });
            setMeasured(true);
        };

        measure();
        window.addEventListener('resize', measure);

        return () => window.removeEventListener('resize', measure);
    }, [stepId, language, targetSelector]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                close();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [close]);

    useEffect(() => {
        if (!measured) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            setAnimate(true);
        });

        return () => window.cancelAnimationFrame(frame);
    }, [measured]);

    useEffect(() => {
        (primaryRef.current as HTMLButtonElement).focus();
    }, [stepId, animate]);

    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
    };
    const panels = computeScrimPanels(layout.hole, viewport);
    const finish = step.next === null;

    return (
        <>
            {panels.map((panel) => (
                <div
                    key={`${panel.left}:${panel.top}:${panel.width}:${panel.height}`}
                    className="tour-scrim fixed"
                    data-testid="tour-scrim"
                    style={{
                        left: panel.left,
                        top: panel.top,
                        width: panel.width,
                        height: panel.height,
                    }}
                />
            ))}
            {layout.hole === null ? null : (
                <div
                    className="tour-ring fixed"
                    data-testid="tour-ring"
                    style={{
                        left: layout.hole.left,
                        top: layout.hole.top,
                        width: layout.hole.width,
                        height: layout.hole.height,
                    }}
                />
            )}
            <div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-title"
                aria-describedby="tour-body"
                data-testid="tour-card"
                data-state={visibility}
                className={cn(
                    'bg-popover text-popover-foreground fixed w-[min(22rem,calc(100vw-2rem))] rounded-lg border p-4 shadow-lg duration-100 transition-none pointer-events-auto',
                    animate &&
                        'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                )}
                style={{
                    left: layout.point.left,
                    top: layout.point.top,
                    visibility: animate ? 'visible' : 'hidden',
                }}
            >
                <p className="text-xs text-muted-foreground">
                    {t('tour.step', {
                        current: step.position,
                        total: TOUR_STEP_COUNT,
                    })}
                </p>
                <h2
                    id="tour-title"
                    className="mt-1 font-heading text-base font-medium"
                >
                    {t(step.titleKey)}
                </h2>
                <p
                    id="tour-body"
                    className="mt-1 text-sm text-muted-foreground"
                >
                    {t(step.bodyKey)}
                </p>
                <div className="mt-4 flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={back}
                        disabled={step.previous === null}
                    >
                        {t('tour.back')}
                    </Button>
                    {finish ? null : (
                        <Button variant="ghost" size="sm" onClick={close}>
                            {t('tour.skip')}
                        </Button>
                    )}
                    <Button
                        ref={primaryRef}
                        className="ml-auto"
                        size="sm"
                        autoFocus
                        onClick={finish ? close : next}
                    >
                        {t(finish ? 'tour.finish' : 'tour.next')}
                    </Button>
                </div>
            </div>
        </>
    );
}
