# Project instructions

## Naming

- Every source file under `src/` and `tests/` uses kebab-case: `app.tsx`, `mops-editor.tsx`, `line-parser.ts`, `app.test.tsx`.
- Tests use the `<module>.test.ts(x)` pattern for unit tests and `tests/e2e/<flow>.spec.ts` for end-to-end tests.
- React component identifiers stay PascalCase inside the file. Only file names are kebab-case.

## Formatting

- Four spaces, LF line endings, single quotes, semicolons, braces on the same line, closing brace on its own line.
- Prettier and ESLint are authoritative. Do not add rule exceptions, `eslint-disable`, or per-file overrides.

## Architecture

- React, TypeScript, Vite, Zustand, CodeMirror 6. No React Router, Canvas, or WebGL.
- shadcn/ui covers the application shell only. The Von-Neumann diagram is custom SVG and uses CSS variables from `src/styles/diagram.css`.
- Use semantic color tokens only. No raw Tailwind status colors and no manual `dark:` color overrides.
- Exactly one bus packet per real external transfer. No packets inside components, no multiple packets, no dashed routing.
- Repository text and code comments are in American English. UI messages are English and German.

## Verification

Run all of these after changes:

```sh
bun run format
bun run lint
bun run typecheck
bun run test:unit
bun run test:e2e
bun run build
```

For UI work, additionally verify at 390, 768, 1366, 1920, and 2560 px in Chromium. Measure computed font sizes and `scrollWidth` against `innerWidth`, and inspect screenshots before committing.

## Layout invariants

- The application shell fits the viewport without page scrolling.
- On phones the machine is visible by default and the editor is one switch away.
- Text scales fluidly with the viewport but stays compact on small screens and keeps a clear hierarchy: card titles larger than controls, controls larger than badges.
- Dialogs and sheets must fit the viewport on phones without clipped or horizontally scrolling content.

## Commits

- Conventional Commits in American English, one concern per commit.
- Never rewrite, amend, or force-push history.
- Commit only after the full verification suite passes.
