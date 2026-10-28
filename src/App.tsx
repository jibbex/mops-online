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

import { CommandReference } from '@/components/command-reference';
import { LanguageToggle } from '@/components/language-toggle';
import { MopsEditor } from '@/components/MopsEditor';
import { SourceFileDialog } from '@/components/source-file-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { VnrDiagram } from '@/components/VnrDiagram';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/i18n/i18n-context';
import {
    translateDiagnostic,
    translateTrap,
    type MessageKey,
} from '@/i18n/messages';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
    isTaskContext,
    PRACTICE_TASK_ID,
    readTaskInfo,
    type TaskInfo,
} from '@/lib/task';
import {
    usePlayer,
    type ExecutionMode,
    type PlayerSpeed,
    type PlayerStatus,
} from '@/player/player';
import { FLOW_DURATION_MS } from '@/player/timing';
import { visualStateFor } from '@/player/visualMap';
import {
    ClipboardList,
    Code2,
    Cpu,
    Pause,
    Play,
    SlidersHorizontal,
    Square,
    StepBack,
    StepForward,
    Wand2,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

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

const STATUS_KEYS: Record<PlayerStatus, MessageKey> = {
    idle: 'status.idle',
    ready: 'status.ready',
    running: 'status.running',
    paused: 'status.paused',
    'waiting-input': 'status.waiting-input',
    'waiting-output': 'status.waiting-output',
    finished: 'status.finished',
    error: 'status.error',
};

/**
 * Renders the complete editor, machine, and execution interface.
 *
 * @returns The application shell element.
 */
export default function App(): ReactElement {
    const { t } = useI18n();
    const player = usePlayer();
    const visual = visualStateFor(player.lastEvent);
    const [task] = useState<TaskInfo>(() =>
        readTaskInfo(window.location.search),
    );
    const [mobileView, setMobileView] = useState<'editor' | 'machine'>(
        'machine',
    );
    const currentLine = player.lastEvent
        ? player.program?.sourceMap[player.lastEvent.address]
        : undefined;
    const animatedSpeed = player.speed === 0 ? 1 : player.speed;
    const flowDurationMs =
        player.status === 'running' && player.speed === 0
            ? 0
            : Math.round(FLOW_DURATION_MS / animatedSpeed);

    return (
        <div className="app-shell flex h-screen flex-col overflow-hidden text-foreground">
            <Header task={task} />
            <Toolbar task={task} />
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
                                    count: player.source.split('\n').length,
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 p-0">
                            <MopsEditor
                                value={player.source}
                                onChange={player.setSource}
                                diagnostics={player.diagnostics}
                                warnings={player.warnings}
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
                        'lg:flex',
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
                                cpu={player.cpu}
                                visual={visual}
                                pulseKey={player.history.length}
                                flowDurationMs={flowDurationMs}
                            />
                        </CardContent>
                    </Card>
                    <StatusBar currentLine={currentLine} />
                </section>
            </main>
            <InputDialog />
            <OutputDialog />
        </div>
    );
}

/**
 * Product header with task context, reference, language, and theme controls.
 *
 * @param task Task metadata read from the page URL.
 * @returns The header element.
 */
function Header({ task }: { readonly task: TaskInfo }): ReactElement {
    const { t } = useI18n();
    const taskName =
        task.title ||
        (task.id === PRACTICE_TASK_ID ? t('task.practice') : task.id);

    return (
        <header className="app-header flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4">
            <span className="brand-mark" aria-hidden="true">
                <Cpu />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
                <h1 className="brand-title text-lg leading-none font-semibold tracking-tight">
                    MOPS
                </h1>
                <p className="mt-1 hidden truncate text-xs leading-none text-muted-foreground sm:block">
                    {t('app.subtitle')}
                </p>
            </div>
            {isTaskContext(task) ? (
                <Badge
                    variant="outline"
                    className="ml-1 hidden max-w-64 sm:inline-flex"
                >
                    <ClipboardList data-icon="inline-start" />
                    <span className="truncate">{taskName}</span>
                </Badge>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
                <CommandReference />
                <LanguageToggle />
                <ThemeToggle />
            </div>
        </header>
    );
}

/**
 * Execution controls and run-mode selectors.
 *
 * @param task Task metadata used by the file dialog.
 * @returns The toolbar element.
 */
function Toolbar({ task }: { readonly task: TaskInfo }): ReactElement {
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
                disabled={running || waiting}
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

/**
 * Compact machine status summary.
 *
 * @param currentLine Source line associated with the last machine event.
 * @returns The status card element.
 */
function StatusBar({
    currentLine,
}: {
    readonly currentLine?: number;
}): ReactElement {
    const { language, t } = useI18n();
    const player = usePlayer();
    const cpu = player.cpu;

    return (
        <Card size="sm" className="app-card shrink-0">
            <CardHeader>
                <CardTitle>{t('status.title')}</CardTitle>
                <CardDescription className="hidden sm:block">
                    {t('status.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
                <StatusValue
                    id="status"
                    label={t('status.status')}
                    value={t(STATUS_KEYS[player.status])}
                    accent={player.status === 'error'}
                />
                <StatusValue
                    id="phase"
                    label={t('status.phase')}
                    value={cpu?.phase ?? '—'}
                />
                <StatusValue
                    id="bz"
                    label={t('status.bz')}
                    value={formatAddress(cpu?.bz ?? 0)}
                />
                <StatusValue
                    id="ac"
                    label={t('status.ac')}
                    value={formatWord(cpu?.ac ?? 0)}
                />
                <StatusValue
                    id="aus"
                    label={t('status.aus')}
                    value={formatWord(cpu?.aus ?? 0)}
                />
                <StatusValue
                    id="line"
                    label={t('status.line')}
                    value={currentLine ? String(currentLine) : '—'}
                />
                <StatusValue
                    id="decoded"
                    label={t('status.decoded')}
                    value={cpu?.decoded || '—'}
                />
                {player.trap ? (
                    <Badge variant="destructive">
                        {player.trap.code}:{' '}
                        {translateTrap(
                            language,
                            player.trap.code,
                            player.trap.message,
                        )}
                    </Badge>
                ) : null}
            </CardContent>
        </Card>
    );
}

/**
 * Renders one labelled status value.
 *
 * @param id Stable test identifier.
 * @param label Visible status label.
 * @param value Formatted status value.
 * @param accent Whether the value uses the destructive accent.
 * @returns The status value element.
 */
function StatusValue({
    id,
    label,
    value,
    accent = false,
}: {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly accent?: boolean;
}): ReactElement {
    return (
        <span className="flex items-center gap-1.5">
            <Badge variant="outline">{label}</Badge>
            <Badge
                variant={accent ? 'destructive' : 'secondary'}
                data-testid={`status-${id}`}
            >
                {value}
            </Badge>
        </span>
    );
}

/**
 * Renders assembler diagnostics and warnings.
 *
 * @returns The diagnostics element, or null when there are no messages.
 */
function Diagnostics(): ReactElement | null {
    const { language, t } = useI18n();
    const player = usePlayer();
    const messages = [...player.diagnostics, ...player.warnings];

    if (messages.length === 0) {
        return null;
    }

    const hasError = messages.some((message) => message.severity === 'error');

    return (
        <Alert
            variant={hasError ? 'destructive' : 'default'}
            className="max-h-32 shrink-0"
        >
            <AlertTitle>{t('diagnostics.title')}</AlertTitle>
            <AlertDescription>
                <ScrollArea className="h-20">
                    <div className="flex flex-col gap-1">
                        {messages.map((message, index) => (
                            <span
                                key={`${message.line}-${message.code}-${index}`}
                            >
                                {t('diagnostics.line', {
                                    line: message.line,
                                    message: translateDiagnostic(
                                        language,
                                        message.code,
                                        message.message,
                                    ),
                                })}
                            </span>
                        ))}
                    </div>
                </ScrollArea>
            </AlertDescription>
        </Alert>
    );
}

/**
 * Renders the input prompt while the VM waits for a value.
 *
 * @returns The input dialog element.
 */
function InputDialog(): ReactElement {
    const { t } = useI18n();
    const player = usePlayer();
    const [value, setValue] = useState('');
    const [invalid, setInvalid] = useState(false);
    const open = player.status === 'waiting-input';

    useEffect(() => {
        if (open) {
            setValue('');
            setInvalid(false);
        }
    }, [open]);

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const parsed = Number.parseInt(value, 10);

        if (!Number.isInteger(parsed) || parsed < -9999 || parsed > 9999) {
            setInvalid(true);
            return;
        }

        setInvalid(false);
        player.provideInput(parsed);
    };

    return (
        <Dialog open={open} onOpenChange={() => undefined}>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{t('input.title')}</DialogTitle>
                    <DialogDescription>
                        {t('input.description')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <FieldGroup>
                        <Field data-invalid={invalid}>
                            <FieldLabel htmlFor="input-value">
                                {t('input.label')}
                            </FieldLabel>
                            <Input
                                id="input-value"
                                type="number"
                                min={-9999}
                                max={9999}
                                value={value}
                                aria-invalid={invalid}
                                onChange={(event) => {
                                    setValue(event.target.value);
                                    setInvalid(false);
                                }}
                                autoFocus
                            />
                            {invalid ? (
                                <FieldDescription className="text-destructive">
                                    {t('input.invalid')}
                                </FieldDescription>
                            ) : (
                                <FieldDescription>
                                    {t('input.validRange')}
                                </FieldDescription>
                            )}
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit">{t('input.submit')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Renders the output dialog while the VM waits for confirmation.
 *
 * @returns The output dialog element.
 */
function OutputDialog(): ReactElement {
    const { t } = useI18n();
    const player = usePlayer();
    const open = player.status === 'waiting-output';

    return (
        <Dialog open={open} onOpenChange={() => undefined}>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{t('output.title')}</DialogTitle>
                    <DialogDescription>
                        {t('output.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border bg-muted/40 px-4 py-6 text-center">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t('output.label')}
                    </p>
                    <p
                        className="font-mono text-3xl font-semibold tabular-nums"
                        data-testid="output-value"
                    >
                        {formatWord(player.lastOutput ?? 0)}
                    </p>
                </div>
                <DialogFooter>
                    <Button onClick={player.acknowledgeOutput}>
                        {t('output.continue')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Renders the assembler listing in a side sheet.
 *
 * @returns The listing trigger and sheet content.
 */
function ListingSheet(): ReactElement {
    const { t } = useI18n();
    const player = usePlayer();
    const listing = player.program?.listing ?? [];

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={!player.program}
                    aria-label={t('listing.trigger')}
                >
                    <Code2 data-icon="inline-start" />
                    <span className="hidden sm:inline">
                        {t('listing.trigger')}
                    </span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle>{t('listing.title')}</SheetTitle>
                    <SheetDescription>
                        {t('listing.description')}
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] px-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('listing.addr')}</TableHead>
                                <TableHead>{t('listing.code')}</TableHead>
                                <TableHead>{t('listing.source')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listing.map((entry) => (
                                <TableRow
                                    key={`${entry.address}-${entry.line}`}
                                >
                                    <TableCell>
                                        {formatAddress(entry.address)}
                                    </TableCell>
                                    <TableCell>
                                        {entry.words.map(formatWord).join(' ')}
                                    </TableCell>
                                    <TableCell>{entry.source}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
