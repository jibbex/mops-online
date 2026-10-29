/**
 * Header button that restarts the guided tour.
 *
 * @module components/tour-button
 */

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-context';
import { openTour } from '@/tour/tour-actions';
import { CircleHelp } from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * Renders the guided tour trigger.
 */
export function TourButton(): ReactElement {
    const { t } = useI18n();

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={t('tour.help')}
            onClick={openTour}
        >
            <CircleHelp />
        </Button>
    );
}
