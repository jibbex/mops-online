/**
 * Guided tour overlay.
 *
 * The overlay is rendered next to the application shell, not inside it. Its
 * scrim panels dim and blur everything except the current target, while the
 * card explains the diagram markers.
 *
 * @module components/tour-overlay
 */

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-context';
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

/**
 * Renders the tour when a step is open.
 */
export function TourOverlay(): ReactElement | null {
    const stepId = useTour((state) => state.stepId);

    if (stepId === null) {
        return null;
    }

    return <TourContent stepId={stepId} />;
}

function TourContent({
    stepId,
}: {
    readonly stepId: TourStepId;
}): ReactElement {
    const { language, t } = useI18n();
    const next = useTour((state) => state.next);
    const back = useTour((state) => state.back);
    const close = useTour((state) => state.close);
    const cardRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<TourLayout>(INITIAL_LAYOUT);
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

    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
    };
    const panels = computeScrimPanels(layout.hole, viewport);
    const finish = step.next === null;

    return (
        <div
            className="pointer-events-none fixed inset-0 z-[60]"
            data-testid="tour"
        >
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
                key={stepId}
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-title"
                aria-describedby="tour-body"
                data-testid="tour-card"
                className="bg-popover text-popover-foreground fixed w-[min(22rem,calc(100vw-2rem))] rounded-lg border p-4 shadow-lg pointer-events-auto"
                style={{
                    left: layout.point.left,
                    top: layout.point.top,
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
                        className="ml-auto"
                        size="sm"
                        autoFocus
                        onClick={finish ? close : next}
                    >
                        {t(finish ? 'tour.finish' : 'tour.next')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
