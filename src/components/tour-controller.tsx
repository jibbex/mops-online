/**
 * Auto-start controller for the guided tour.
 *
 * The controller renders nothing and reacts to the first executed step. The
 * page-load flag in the tour store prevents a second automatic open even when
 * storage is unavailable.
 *
 * @module components/tour-controller
 */

import { usePlayer } from '@/player/player';
import { openTour, shouldAutoStart } from '@/tour/tour-actions';
import { readTourSeen } from '@/tour/tour-storage';
import { useTour } from '@/tour/tour-store';
import { useEffect } from 'react';

/**
 * Opens the tour after the first executed machine step.
 */
export function TourController(): null {
    const status = usePlayer((state) => state.status);
    const historyLength = usePlayer((state) => state.history.length);

    useEffect(() => {
        if (
            shouldAutoStart({
                seen: readTourSeen(),
                started: useTour.getState().started,
                status,
                historyLength,
            })
        ) {
            openTour();
        }
    }, [status, historyLength]);

    return null;
}
