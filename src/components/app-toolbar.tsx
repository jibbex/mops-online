/**
 * Execution controls and run-mode selectors.
 *
 * @module components/app-toolbar
 */

import { ListingSheet } from '@/components/listing-sheet';
import { SourceFileDialog } from '@/components/source-file-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/i18n/i18n-context';
import type { MessageKey } from '@/i18n/messages';
import type { TaskInfo } from '@/lib/task';
import {
    usePlayer,
    type ExecutionMode,
    type PlayerSpeed,
} from '@/player/player';
import {
    Pause,
    Play,
    SlidersHorizontal,
    Square,
    StepBack,
    StepForward,
    Wand2,
} from 'lucide-react';
import type { ReactElement } from 'react';

/** Pause modes exposed by the toolbar. */
const MODES: { readonly value: ExecutionMode; readonly key: MessageKey }[] = [
    { value: 'micro', key: 'mode.micro' },
    { value: 'phase', key: 'mode.phases' },
    { value: 'instruction', key: 'mode.commands' },
    { value: 'output', key: 'mode.output' },
    { value: 'run', key: 'mode.run' },
];

/** Playback speeds exposed by the toolbar. */
const SPEEDS: { readonly value: PlayerSpeed; readonly label: string }[] = [
    { value: 0, label: '0' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
];

/**
 * Renders the execution toolbar.
 *
 * @param task Task metadata used by the file dialog.
 * @returns The toolbar element.
 */
export function AppToolbar({
    task,
}: {
    readonly task: TaskInfo;
}): ReactElement {
    const { t } = useI18n();
    const player = usePlayer();
    const running = player.status === 'running';
    const waiting =
        player.status === 'waiting-input' || player.status === 'waiting-output';

    return (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-2 lg:px-4">
            <Button
                size="sm"
                onClick={player.assemble}
                aria-label={t('toolbar.assemble')}
            >
                <Wand2 data-icon="inline-start" />
                <span className="hidden sm:inline">
                    {t('toolbar.assemble')}
                </span>
            </Button>
            <Button
                size="sm"
                onClick={player.start}
                disabled={!player.program || running || waiting}
                aria-label={t('toolbar.start')}
            >
                <Play data-icon="inline-start" />
                <span className="hidden sm:inline">{t('toolbar.start')}</span>
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={player.pause}
                disabled={!running}
                aria-label={t('toolbar.pause')}
            >
                <Pause data-icon="inline-start" />
                <span className="hidden sm:inline">{t('toolbar.pause')}</span>
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={player.step}
                disabled={
                    !player.program ||
                    running ||
                    waiting ||
                    player.status === 'finished' ||
                    player.status === 'error'
                }
                aria-label={t('toolbar.step')}
            >
                <StepForward data-icon="inline-start" />
                <span className="hidden sm:inline">{t('toolbar.step')}</span>
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={player.stepBack}
                disabled={
                    player.history.length === 0 ||
                    running ||
                    player.status === 'waiting-output'
                }
                aria-label={t('toolbar.back')}
            >
                <StepBack data-icon="inline-start" />
                <span className="hidden sm:inline">{t('toolbar.back')}</span>
            </Button>
            <Button
                size="sm"
                variant="destructive"
                onClick={player.stop}
                disabled={!player.program}
                aria-label={t('toolbar.stop')}
            >
                <Square data-icon="inline-start" />
                <span className="hidden sm:inline">{t('toolbar.stop')}</span>
            </Button>
            <ListingSheet />
            <SourceFileDialog
                task={task}
                source={player.source}
                onImport={player.setSource}
            />

            <Separator orientation="vertical" className="hidden h-6 lg:block" />

            <Field
                orientation="horizontal"
                className="hidden w-auto shrink-0 lg:flex"
            >
                <FieldLabel className="sr-only">{t('mode.label')}</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={player.mode}
                    onValueChange={(value) => {
                        if (value) {
                            player.setMode(value as ExecutionMode);
                        }
                    }}
                    aria-label={t('mode.label')}
                >
                    {MODES.map((mode) => (
                        <ToggleGroupItem key={mode.value} value={mode.value}>
                            {t(mode.key)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>

            <Field
                orientation="horizontal"
                className="hidden w-auto shrink-0 lg:flex"
            >
                <FieldLabel className="sr-only">{t('speed.label')}</FieldLabel>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={String(player.speed)}
                    onValueChange={(value) => {
                        if (value) {
                            player.setSpeed(Number(value) as PlayerSpeed);
                        }
                    }}
                    aria-label={t('speed.label')}
                >
                    {SPEEDS.map((speed) => (
                        <ToggleGroupItem
                            key={speed.value}
                            value={String(speed.value)}
                        >
                            {speed.value === 0 ? t('speed.off') : speed.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        className="lg:hidden"
                        aria-label={t('settings.label')}
                    >
                        <SlidersHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>{t('mode.label')}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={player.mode}
                        onValueChange={(value) =>
                            player.setMode(value as ExecutionMode)
                        }
                    >
                        {MODES.map((mode) => (
                            <DropdownMenuRadioItem
                                key={mode.value}
                                value={mode.value}
                            >
                                {t(mode.key)}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>{t('speed.label')}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={String(player.speed)}
                        onValueChange={(value) =>
                            player.setSpeed(Number(value) as PlayerSpeed)
                        }
                    >
                        {SPEEDS.map((speed) => (
                            <DropdownMenuRadioItem
                                key={speed.value}
                                value={String(speed.value)}
                            >
                                {speed.value === 0
                                    ? t('speed.off')
                                    : speed.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
