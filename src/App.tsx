import { Button } from '@/components/ui/button';

export default function App() {
    return (
        <main className="min-h-screen bg-background px-6 py-10 text-foreground">
            <h1 className="text-3xl font-semibold tracking-tight">MOPS</h1>
            <p className="mt-2 text-muted-foreground">
                A web-based von Neumann model computer.
            </p>
            <Button className="mt-6">Assemble</Button>
        </main>
    );
}
