/**
 * Application shell.
 *
 * The shell connects the player store to the editor, execution controls, status
 * display, machine diagram, input dialog, and listing. It contains presentation
 * and command wiring only; machine semantics live in the core and player modules.
 *
 * @module App
 */

import { MopsEditor } from '@/components/MopsEditor';
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
import { formatAddress, formatWord } from '@/lib/format';
import {
    usePlayer,
    type ExecutionMode,
    type PlayerSpeed,
    type PlayerStatus,
} from '@/player/player';
import { visualStateFor } from '@/player/visualMap';
import { Code2 } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

/** Pause modes exposed by the toolbar. */
const MODES: { value: ExecutionMode; label: string }[] = [
    { value: 'micro', label: 'Micro' },
    { value: 'phase', label: 'Phases' },
    { value: 'instruction', label: 'Commands' },
    { value: 'output', label: 'Output' },
    { value: 'run', label: 'Run' },
];

/** Playback speeds exposed by the toolbar. */
const SPEEDS: { value: PlayerSpeed; label: string }[] = [
    { value: 0, label: 'Off' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
];

/**
 * Renders the complete editor, machine, and execution interface.
 *
 * @returns The application shell element.
 */
export default function App(): ReactElement {
    const player = usePlayer();
    const visual = visualStateFor(player.lastEvent);
    const currentLine = player.lastEvent
        ? player.program?.sourceMap[player.lastEvent.address]
        : undefined;

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
            <Header />
            <Toolbar />
            <main className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden p-2 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]">
                <section className="flex min-h-0 flex-col gap-2">
                    <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
                        <CardHeader className="shrink-0 border-b">
                            <CardTitle>Assembly source</CardTitle>
                            <CardDescription>
                                {player.source.split('\n').length} lines
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 p-0">
                            <MopsEditor
                                value={player.source}
                                onChange={player.setSource}
                            />
                        </CardContent>
                    </Card>
                    <Diagnostics />
                </section>

                <section className="flex min-h-0 flex-col gap-2">
                    <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
                        <CardHeader className="shrink-0 border-b">
                            <CardTitle>Machine</CardTitle>
                            <CardDescription>
                                Live von Neumann machine state
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-0 flex-1 p-1">
                            <VnrDiagram cpu={player.cpu} visual={visual} />
                        </CardContent>
                    </Card>
                    <StatusBar currentLine={currentLine} />
                </section>
            </main>
            <InputDialog />
        </div>
    );
}

/**
 * Product header with theme controls.
 *
 * @returns The header element.
 */
function Header(): ReactElement {
    return (
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
            <h1 className="text-xl font-semibold tracking-tight">MOPS</h1>
            <Separator orientation="vertical" className="h-5" />
            <p className="text-sm text-muted-foreground">
                A web-based von Neumann model computer.
            </p>
            <div className="ml-auto">
                <ThemeToggle />
            </div>
        </header>
    );
}

/**
 * Execution controls and run-mode selectors.
 *
 * @returns The toolbar element.
 */
function Toolbar(): ReactElement {
    const player = usePlayer();
    const running = player.status === 'running';
    const waiting = player.status === 'waiting-input';

    return (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
            <Button variant="outline" onClick={player.assemble}>
                Assemble
            </Button>
            <Button onClick={player.start} disabled={running || waiting}>
                Start
            </Button>
            <Button
                variant="outline"
                onClick={player.pause}
                disabled={!running}
            >
                Pause
            </Button>
            <Button
                variant="outline"
                onClick={player.step}
                disabled={
                    running ||
                    waiting ||
                    player.status === 'finished' ||
                    player.status === 'error'
                }
            >
                Step
            </Button>
            <Button
                variant="outline"
                onClick={player.stepBack}
                disabled={player.history.length === 0 || running}
            >
                Back
            </Button>
            <Button
                variant="destructive"
                onClick={player.stop}
                disabled={!player.program}
            >
                Stop
            </Button>
            <ListingSheet />

            <Separator orientation="vertical" className="h-6" />

            <Field orientation="horizontal" className="w-auto">
                <FieldLabel className="sr-only">Mode</FieldLabel>
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
                    aria-label="Mode"
                >
                    {MODES.map((mode) => (
                        <ToggleGroupItem key={mode.value} value={mode.value}>
                            {mode.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>

            <Field orientation="horizontal" className="w-auto">
                <FieldLabel className="sr-only">Speed</FieldLabel>
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
                    aria-label="Speed"
                >
                    {SPEEDS.map((speed) => (
                        <ToggleGroupItem
                            key={speed.value}
                            value={String(speed.value)}
                        >
                            {speed.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </Field>
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
    const player = usePlayer();
    const cpu = player.cpu;

    return (
        <Card size="sm" className="shrink-0">
            <CardHeader>
                <CardTitle>Status</CardTitle>
                <CardDescription>Live machine values</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
                <StatusValue
                    label="Status"
                    value={statusLabel(player.status)}
                    accent={player.status === 'error'}
                />
                <StatusValue label="Phase" value={cpu?.phase ?? '—'} />
                <StatusValue label="BZ" value={formatAddress(cpu?.bz ?? 0)} />
                <StatusValue label="AC" value={formatWord(cpu?.ac ?? 0)} />
                <StatusValue label="AUS" value={formatWord(cpu?.aus ?? 0)} />
                <StatusValue
                    label="Line"
                    value={currentLine ? String(currentLine) : '—'}
                />
                <StatusValue label="Decoded" value={cpu?.decoded || '—'} />
                {player.trap ? (
                    <Badge variant="destructive">
                        {player.trap.code}: {player.trap.message}
                    </Badge>
                ) : null}
            </CardContent>
        </Card>
    );
}

/**
 * Renders one labelled status value.
 *
 * @param label Visible status label.
 * @param value Formatted status value.
 * @param accent Whether the value uses the destructive accent.
 * @returns The status value element.
 */
function StatusValue({
    label,
    value,
    accent = false,
}: {
    readonly label: string;
    readonly value: string;
    readonly accent?: boolean;
}): ReactElement {
    return (
        <span className="flex items-center gap-1">
            <Badge variant="outline">{label}</Badge>
            <Badge
                variant={accent ? 'destructive' : 'secondary'}
                data-testid={`status-${label.toLowerCase()}`}
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
            <AlertTitle>Diagnostics</AlertTitle>
            <AlertDescription>
                <ScrollArea className="h-20">
                    <div className="flex flex-col gap-1">
                        {messages.map((message, index) => (
                            <span
                                key={`${message.line}-${message.code}-${index}`}
                            >
                                Line {message.line}: {message.message}
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
    const player = usePlayer();
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const open = player.status === 'waiting-input';

    useEffect(() => {
        if (open) {
            setValue('');
            setError('');
        }
    }, [open]);

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const parsed = Number.parseInt(value, 10);

        if (!Number.isInteger(parsed) || parsed < -9999 || parsed > 9999) {
            setError('Enter an integer from -9999 to 9999.');
            return;
        }

        setError('');
        player.provideInput(parsed);
    };

    return (
        <Dialog open={open} onOpenChange={() => undefined}>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Input required</DialogTitle>
                    <DialogDescription>
                        The input register is waiting for a value.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <FieldGroup>
                        <Field data-invalid={error !== ''}>
                            <FieldLabel htmlFor="input-value">
                                Input value
                            </FieldLabel>
                            <Input
                                id="input-value"
                                type="number"
                                min={-9999}
                                max={9999}
                                value={value}
                                aria-invalid={error !== ''}
                                onChange={(event) =>
                                    setValue(event.target.value)
                                }
                                autoFocus
                            />
                            {error ? (
                                <FieldDescription className="text-destructive">
                                    {error}
                                </FieldDescription>
                            ) : (
                                <FieldDescription>
                                    Valid range: -9999 to 9999.
                                </FieldDescription>
                            )}
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="submit">Submit</Button>
                    </DialogFooter>
                </form>
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
    const player = usePlayer();
    const listing = player.program?.listing ?? [];

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" disabled={!player.program}>
                    <Code2 data-icon="inline-start" />
                    Listing
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle>Machine code listing</SheetTitle>
                    <SheetDescription>
                        Source lines, addresses, and encoded words
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] px-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Addr</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Source</TableHead>
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

/**
 * Maps an internal player status to its user-facing label.
 *
 * @param status Current player status.
 * @returns The visible status label.
 */
function statusLabel(status: PlayerStatus): string {
    switch (status) {
        case 'idle':
            return 'Idle';
        case 'ready':
            return 'Ready';
        case 'running':
            return 'Running';
        case 'paused':
            return 'Paused';
        case 'waiting-input':
            return 'Waiting for input';
        case 'finished':
            return 'Finished';
        case 'error':
            return 'Error';
    }
}
