import { Button } from '@/components/ui/button';
import { MopsEditor } from '@/components/MopsEditor';
import { VnrDiagram } from '@/components/VnrDiagram';
import { formatAddress, formatWord } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
    usePlayer,
    type ExecutionMode,
    type PlayerSpeed,
} from '@/player/player';
import { visualStateFor } from '@/player/visualMap';
import { useState, type FormEvent } from 'react';

const MODES: { value: ExecutionMode; label: string }[] = [
    { value: 'micro', label: 'Microcycles' },
    { value: 'phase', label: 'Machine phases' },
    { value: 'instruction', label: 'Instruction cycles' },
    { value: 'output', label: 'Output stop' },
    { value: 'run', label: 'Complete' },
];

const SPEEDS: { value: PlayerSpeed; label: string }[] = [
    { value: 0, label: 'Off' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
];

export default function App() {
    const player = usePlayer();
    const visual = visualStateFor(player.lastEvent);
    const currentLine = player.lastEvent
        ? player.program?.sourceMap[player.lastEvent.address]
        : undefined;

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="border-b px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        MOPS
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        A web-based von Neumann model computer.
                    </p>
                </div>
            </header>

            <Toolbar />

            <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.6fr)]">
                <section className="flex min-h-0 flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wide">
                            Assembly source
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {player.source.split('\n').length} lines
                        </span>
                    </div>
                    <div className="min-h-[320px] flex-1">
                        <MopsEditor
                            value={player.source}
                            onChange={player.setSource}
                        />
                    </div>
                    <Diagnostics />
                </section>

                <section className="flex min-h-0 flex-col gap-3">
                    <div className="rounded-lg border bg-card p-3">
                        <VnrDiagram cpu={player.cpu} visual={visual} />
                    </div>
                    <StatusBar currentLine={currentLine} />
                    {player.status === 'waiting-input' ? <InputPanel /> : null}
                    <Listing />
                </section>
            </main>
        </div>
    );
}

function Toolbar() {
    const player = usePlayer();
    const running = player.status === 'running';
    const waiting = player.status === 'waiting-input';

    return (
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
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

            <div className="ml-auto flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    Mode
                    <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                        value={player.mode}
                        onChange={(event) =>
                            player.setMode(event.target.value as ExecutionMode)
                        }
                    >
                        {MODES.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                                {mode.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    Speed
                    <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                        value={player.speed}
                        onChange={(event) =>
                            player.setSpeed(
                                Number(event.target.value) as PlayerSpeed,
                            )
                        }
                    >
                        {SPEEDS.map((speed) => (
                            <option key={speed.value} value={speed.value}>
                                {speed.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    );
}

function StatusBar({ currentLine }: { readonly currentLine?: number }) {
    const player = usePlayer();
    const cpu = player.cpu;

    return (
        <div className="rounded-lg border bg-card px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
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
            </div>
            {player.trap ? (
                <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    {player.trap.code}: {player.trap.message}
                </p>
            ) : null}
        </div>
    );
}

function StatusValue({
    label,
    value,
    accent = false,
}: {
    readonly label: string;
    readonly value: string;
    readonly accent?: boolean;
}) {
    return (
        <span className="flex items-baseline gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </span>
            <span
                data-testid={`status-${label.toLowerCase()}`}
                className={cn(
                    'font-mono text-sm',
                    accent && 'text-destructive',
                )}
            >
                {value}
            </span>
        </span>
    );
}

function Diagnostics() {
    const player = usePlayer();
    const diagnostics = [...player.diagnostics, ...player.warnings];

    if (diagnostics.length === 0) {
        return null;
    }

    return (
        <div className="max-h-40 overflow-auto rounded-md border bg-card p-2 text-xs">
            {diagnostics.map((diagnostic, index) => (
                <p
                    key={`${diagnostic.line}-${diagnostic.code}-${index}`}
                    className={cn(
                        'py-0.5',
                        diagnostic.severity === 'error'
                            ? 'text-destructive'
                            : 'text-amber-700',
                    )}
                >
                    Line {diagnostic.line}: {diagnostic.message}
                </p>
            ))}
        </div>
    );
}

function InputPanel() {
    const player = usePlayer();
    const [value, setValue] = useState('');
    const [error, setError] = useState('');

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const parsed = Number.parseInt(value, 10);

        if (!Number.isInteger(parsed) || parsed < -9999 || parsed > 9999) {
            setError('Enter an integer from -9999 to 9999.');
            return;
        }

        setError('');
        setValue('');
        player.provideInput(parsed);
    };

    return (
        <form
            className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3"
            onSubmit={submit}
        >
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Input register
                <input
                    className="h-8 rounded-md border border-input bg-background px-2 font-mono text-sm text-foreground"
                    type="number"
                    min={-9999}
                    max={9999}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    autoFocus
                />
            </label>
            <Button type="submit">Submit</Button>
            {error ? (
                <p className="text-xs text-destructive">{error}</p>
            ) : (
                <p className="text-xs text-muted-foreground">
                    The input register is waiting for a value.
                </p>
            )}
        </form>
    );
}

function Listing() {
    const player = usePlayer();

    if (!player.program) {
        return null;
    }

    return (
        <details className="rounded-lg border bg-card p-3 text-xs">
            <summary className="cursor-pointer font-semibold">
                Machine code listing
            </summary>
            <div className="mt-2 max-h-40 overflow-auto">
                <table className="w-full border-collapse font-mono">
                    <thead>
                        <tr className="text-left text-muted-foreground">
                            <th className="pr-3">Addr</th>
                            <th className="pr-3">Code</th>
                            <th>Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {player.program.listing.map((entry) => (
                            <tr key={`${entry.address}-${entry.line}`}>
                                <td className="pr-3 align-top">
                                    {formatAddress(entry.address)}
                                </td>
                                <td className="pr-3 align-top">
                                    {entry.words.map(formatWord).join(' ')}
                                </td>
                                <td className="align-top">{entry.source}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    );
}

function statusLabel(
    status: ReturnType<typeof usePlayer.getState>['status'],
): string {
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
