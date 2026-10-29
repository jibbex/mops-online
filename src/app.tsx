/**
 * Application shell.
 *
 * The shell connects the player store to the editor, execution controls, status
 * display, machine diagram, input dialog, reference, and solution exchange. It
 * contains presentation and command wiring only; machine semantics live in the
 * core and player modules.
 *
 * @module App
 */

import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { AppToolbar } from '@/components/app-toolbar';
import { Diagnostics } from '@/components/diagnostics';
import { InputDialog } from '@/components/input-dialog';
import { MopsEditor } from '@/components/mops-editor';
import { OutputDialog } from '@/components/output-dialog';
import { StatusBar } from '@/components/status-bar';
import { VnrDiagram } from '@/components/vnr-diagram';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/i18n/i18n-context';
import { readTaskInfo, type TaskInfo } from '@/lib/task';
import { cn } from '@/lib/utils';
import { NORMAL_SPEED, usePlayer } from '@/player/player';
import { FLOW_DURATION_MS } from '@/player/timing';
import { visualStateFor } from '@/player/visual-map';
import { useState, type ReactElement } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Renders the complete editor, machine, and execution interface.
 *
 * @returns The application shell element.
 */
export default function App(): ReactElement {
    const { t } = useI18n();
    const {
        source,
        setSource,
        diagnostics,
        warnings,
        cpu,
        pc,
        lastEvent,
        program,
        status,
        speed,
        historyLength,
    } = usePlayer(
        useShallow((state) => ({
            source: state.source,
            setSource: state.setSource,
            diagnostics: state.diagnostics,
            warnings: state.warnings,
            cpu: state.cpu,
            pc: state.cpu?.pc ?? 0,
            lastEvent: state.lastEvent,
            program: state.program,
            status: state.status,
            speed: state.speed,
            historyLength: state.history.length,
        })),
    );
    const visual = visualStateFor(lastEvent);
    const [task] = useState<TaskInfo>(() =>
        readTaskInfo(window.location.search),
    );
    // Phones start on the machine: the animation is the primary teaching
    // surface, and the editor is one explicit switch away.
    const [mobileView, setMobileView] = useState<'editor' | 'machine'>(
        'machine',
    );
    const currentLine = lastEvent
        ? program?.sourceMap[lastEvent.address]
        : undefined;
    const animatedSpeed = speed === 0 ? NORMAL_SPEED : speed;
    const flowDurationMs =
        status === 'running' && speed === 0
            ? 0
            : Math.round(FLOW_DURATION_MS / animatedSpeed);

    return (
        <div className="app-shell flex h-screen flex-col overflow-hidden text-foreground">
            <AppHeader task={task} />
            <AppToolbar task={task} />
            <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden p-2 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)] lg:grid-rows-[minmax(0,1fr)]">
                <div className="flex items-center lg:hidden">
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        value={mobileView}
                        onValueChange={(value) => {
                            if (value === 'editor' || value === 'machine') {
                                setMobileView(value);
                            }
                        }}
                        aria-label={t('view.label')}
                    >
                        <ToggleGroupItem value="editor" className="flex-1">
                            {t('view.editor')}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="machine" className="flex-1">
                            {t('view.machine')}
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
                <section
                    className={cn(
                        'flex min-h-0 flex-col gap-2',
                        mobileView !== 'editor' && 'hidden',
                        'lg:flex',
                    )}
                >
                    <Card className="app-card flex min-h-0 flex-1 flex-col gap-0 py-0">
                        <CardHeader className="shrink-0 border-b">
                            <CardTitle>{t('editor.title')}</CardTitle>
                            <CardDescription>
                                {t('editor.lines', {
                                    count: source.split('\n').length,
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 p-0">
                            <MopsEditor
                                value={source}
                                onChange={setSource}
                                diagnostics={diagnostics}
                                warnings={warnings}
                                currentLine={currentLine}
                            />
                        </CardContent>
                    </Card>
                    <Diagnostics />
                </section>

                <section
                    className={cn(
                        'flex min-h-0 flex-col gap-2',
                        mobileView !== 'machine' && 'hidden',
                        'lg:max-wide:flex',
                        'wide:grid wide:grid-cols-[minmax(0,1fr)_16rem] wide:grid-rows-[minmax(0,1fr)]',
                    )}
                >
                    <Card className="app-card flex min-h-0 flex-1 flex-col gap-0 py-0">
                        <CardHeader className="shrink-0 border-b">
                            <CardTitle>{t('machine.title')}</CardTitle>
                            <CardDescription>
                                {t('machine.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 p-1">
                            <VnrDiagram
                                cpu={cpu}
                                pc={pc}
                                visual={visual}
                                pulseKey={historyLength}
                                flowDurationMs={flowDurationMs}
                            />
                        </CardContent>
                    </Card>
                    <StatusBar
                        currentLine={currentLine}
                        className="wide:self-start"
                    />
                </section>
            </main>
            <AppFooter />
            <InputDialog />
            <OutputDialog />
        </div>
    );
}
