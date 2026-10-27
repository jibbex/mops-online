<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white" alt="Bun">
  <img src="https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest">
  <img src="https://img.shields.io/badge/Tested_with-Playwright-2EAD33?logo=playwright&logoColor=white" alt="Playwright">
</p>

<!-- Logo: add the final logo asset here. -->

# MOPS

MOPS is a web-based educational model computer with an integrated assembler and a
von Neumann machine simulator. It is designed to help students understand how a
simple CPU fetches, decodes, and executes instructions.

## Table of Contents

- [Features](#features)
    - [Usage](#usage)
- [Development Setup](#development-setup)
    - [Requirements](#requirements)
    - [Installation](#installation)
        - [Windows](#windows)
        - [Linux](#linux)
    - [Configuration](#configuration)
    - [Run](#run)
    - [Test](#test)
    - [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
    - [Requirements](#requirements-1)
    - [Installation](#installation-1)
    - [Configuration](#configuration-1)
    - [Run](#run-1)
    - [Update](#update)
    - [Maintenance](#maintenance)
- [Project Structure and Architecture](#project-structure-and-architecture)
    - [Scope](#scope)
    - [Conventions](#conventions)
- [License](#license)

## Features

MOPS provides a complete, browser-based environment for writing and running
assembly programs on a simplified von Neumann machine.

- A source editor with line numbers, syntax highlighting, and inline diagnostics.
- A two-pass assembler with symbols, forward references, and source maps.
- A machine-code listing that shows the generated object program.
- A virtual machine with fetch, decode, and execute phases.
- A live SVG diagram of the model computer.
- Visible registers, memory cells, buses, and control signals.
- Run, pause, step, and stop controls.
- Configurable execution modes and animation speed.
- Input and output registers with validation.
- Runtime traps for division by zero, overflow, and invalid instructions.
- Execution history with backward stepping.
- Breakpoints and source-level debugging.

### Usage

1. Write an assembly program in the editor or load an example.
2. Assemble the program.
3. Resolve any diagnostics shown in the editor.
4. Inspect the generated machine code in the listing view.
5. Start the program and observe the microcycles in the diagram.
6. Pause, step, or rewind to inspect individual states.
7. Enter a value when the input register requests one.

## Development Setup

### Requirements

- Bun for dependency management and scripts.
- Node.js LTS for Vitest and other Node-based tooling.
- Git.
- Playwright browser binaries.
- On Linux, the system dependencies required by Playwright.

The examples below use Bun. Node.js remains required because Vitest runs on Node,
not on the Bun runtime.

### Installation

#### Windows

```powershell
git clone <repository-url>
cd mops
bun install
bunx playwright install
```

#### Linux

```shell
git clone <repository-url>
cd mops
bun install
bunx playwright install --with-deps
```

`--with-deps` may require elevated permissions, depending on the distribution.

Additional notes:

- Use a current Bun release and a current Node.js LTS release.
- Run the commands from the repository root.
- Commit the Bun lockfile.

### Configuration

No environment variables are required for the default local setup.

The development build includes a component harness for visual checks. It is excluded
from production builds.

### Run

```shell
bun run dev
```

### Test

```shell
bun run lint
bun run format:check
bun run typecheck
bun run test:unit
bun run test:e2e
```

Install the Playwright browsers before running the end-to-end tests:

```shell
bunx playwright install
```

Use `bun run test:unit`, not `bun test`. `bun test` starts Bun's built-in test runner,
not Vitest.

### Troubleshooting

- **Vitest does not start with `bun test`:** use `bun run test:unit`.
- **Node.js version mismatch:** install a current LTS release and reinstall
  dependencies with `bun install --frozen-lockfile`.
- **Playwright browser missing:** run `bunx playwright install`.
- **Playwright system dependencies missing on Linux:** run
  `bunx playwright install --with-deps`.
- **Port already in use:** stop the conflicting process or change the Vite
  development port.
- **Stale dependencies:** remove `node_modules` and run
  `bun install --frozen-lockfile`.

## Deployment

### Requirements

- Bun for installing dependencies and running the build.
- Node.js LTS for the build toolchain.
- A static file host or web server.
- No application server or database is required.

### Installation

Build the application:

```shell
bun install --frozen-lockfile
bun run build
```

Deploy the generated `dist/` directory to the static host.

### Configuration

The production build is a static application and requires no runtime environment
variables.

If the application is hosted under a subpath, set Vite's `base` option accordingly
before building.

### Run

For local verification of the production build:

```shell
bun run preview
```

In production, serve the contents of `dist/` with the static host.

### Update

```shell
git pull
bun install --frozen-lockfile
bun run build
```

Deploy the updated `dist/` directory.

### Maintenance

- Update dependencies deliberately and review the changelogs.
- Run linting, type checking, unit tests, end-to-end tests, and a production build
  before deploying.
- Verify the production bundle does not contain development-only code.
- Reinstall Playwright browsers after major Playwright upgrades.

## Project Structure and Architecture

```text
src/
  core/
    isa/            Instruction set definitions and opcode metadata
    object/         Object program, listing, and serialization
    assembler/      Scanner, parser, encoder, resolver, diagnostics
    vm/             CPU state, micro-ops, execution, traps, disassembler
    trace/          Execution events and snapshots
  player/           Timing, playback, history, and visual event mapping
  ui/
    components/     Application shell and reusable UI components
    diagram/        SVG diagram, layout, and visual states
    styles/         Design tokens and diagram styles
  main.tsx
docs/
  architecture.md
LICENSE
README.md
```

Core ideas:

- The assembler produces an object program; the VM executes only that object
  program.
- The VM does not know about source text, labels, comments, or mnemonics.
- Source maps connect machine-code addresses back to editor lines.
- The player owns timing, pausing, input handling, and execution history.
- The UI renders state and visual events; it contains no machine logic.
- The diagram is rendered with SVG and styled with CSS variables.
- shadcn/ui components live in `src/components/ui` and are used only for the
  application shell, never for the SVG diagram.

Tech stack:

- Vite
- React
- TypeScript
- Bun
- Node.js LTS for Vitest and related tooling
- Tailwind CSS for the application shell
- shadcn/ui for application shell components
- CSS variables and a dedicated stylesheet for the SVG diagram
- CodeMirror 6
- Zustand
- Vitest
- Testing Library
- Playwright
- ESLint
- Prettier
- Husky
- commitlint

Common additions:

- **New instruction:** update the ISA table, assembler encoding, VM micro-ops,
  visual mapping, tests, and documentation.
- **New diagram element:** add its layout data, SVG component, visual mapping,
  fixture, and Playwright coverage.

See [`docs/architecture.md`](docs/architecture.md) for the detailed architecture and
[`docs/implementation-plan.md`](docs/implementation-plan.md) for the implementation
and test plan.

### Scope

MOPS implements a simplified educational model computer.

It includes:

- a 72-cell memory,
- a 15-instruction assembly language,
- an assembler with symbolic labels,
- a fetch-decode-execute VM,
- a live SVG visualization,
- debugging and execution history.

It does not include:

- a real processor or native machine code,
- indirect addressing,
- processor flags,
- bit manipulation,
- macros or compiler directives,
- a high-level language.

### Conventions

- All repository text is written in American English.
- Indentation uses four spaces.
- Line endings use LF.
- Control-flow blocks always use braces.
- Opening braces stay on the same line.
- Closing braces start a new line.
- `} else {`, `} catch (...) {`, and `} finally {` stay on one line.
- Commit messages follow Conventional Commits.
- The scope is optional.
- Branches use prefixes such as `feat/`, `fix/`, and `docs/`.
- Merges use squash merge with a Conventional Commit title.
- ESLint handles linting; Prettier handles formatting.
- `eslint-config-prettier` disables conflicting ESLint formatting rules.

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for the
full text.
