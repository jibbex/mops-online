# Implementation and Test Plan

This plan is derived from [`architecture.md`](architecture.md). It defines the
implementation order, the test level for each step, and the acceptance criteria for
each slice.

## 1. Testing Principles

- Test each behavior at the lowest level that can prove it.
- Pure core logic is covered by Vitest unit tests without a browser.
- React component behavior is covered by Vitest, jsdom, and Testing Library.
- User-visible flows are covered by Playwright end-to-end tests.
- SVG geometry, layout, and visual states are covered by Playwright, not jsdom.
- Not every internal step gets an E2E test. Internal steps get unit tests; E2E
  coverage starts when the behavior is reachable through the UI.
- Prefer representative E2E flows over duplicating every unit-test case in the
  browser.
- Every test must be deterministic. Use fake timers for player tests and disable
  animations in E2E runs.

## 2. Test Layers

| Layer              | Tool                     | Environment   | Scope                                                      |
| ------------------ | ------------------------ | ------------- | ---------------------------------------------------------- |
| Core unit tests    | Vitest                   | Node          | ISA, object program, assembler, VM, player logic           |
| Component tests    | Vitest + Testing Library | jsdom         | React components, forms, toolbar, status, panels           |
| Integration tests  | Vitest                   | Node or jsdom | Assembler-to-VM and player-to-visual mapping               |
| End-to-end tests   | Playwright               | Chromium      | Real browser flows, keyboard, input, SVG state changes     |
| Visual tests       | Playwright screenshots   | Chromium      | Stable diagram states at desktop, tablet, and mobile sizes |
| Differential tests | Vitest + Python fixtures | Node          | Compare object code and VM traces against the original     |

## 3. Definition of Done

A step is complete only when all applicable items are true:

- Unit tests cover the new logic and its edge cases.
- Component tests cover new interactive UI behavior.
- E2E tests cover the new user-visible flow, or the step documents why no E2E test
  is possible yet.
- `bun run lint` passes.
- `bun run format:check` passes.
- `bun run typecheck` passes.
- `bun run test:unit` passes.
- `bun run test:e2e` passes when the step has an E2E test.
- `bun run build` passes.
- Public behavior and architecture documents are updated.
- The commit follows Conventional Commits.

## 4. Implementation Stages

### Stage A: Core Foundations

No UI is required in this stage. Each module gets unit tests.

#### A1. ISA Definition

Deliverables:

- `core/isa/opcodes.ts`
- `core/isa/instructions.ts`
- `core/isa/semantics.ts`

Unit tests:

- Every mnemonic has an instruction specification.
- Opcodes are unique.
- Address and immediate opcodes are paired correctly.
- Jump opcodes and the `end` opcode are defined.
- Operand modes are valid for each instruction.
- Encoding and decoding use the same ISA table.

E2E: not applicable; no user-visible behavior yet.

#### A2. Object Program Model

Deliverables:

- `core/object/program.ts`
- `core/object/serialize.ts`

Unit tests:

- Object program serialization round-trips without data loss.
- Source maps and listing entries preserve addresses and line numbers.
- Invalid object programs are rejected.
- Symbol tables contain resolved addresses.

E2E: not applicable.

#### A3. Assembler Front End

Deliverables:

- `core/assembler/line-scanner.ts`
- `core/assembler/line-parser.ts`
- `core/assembler/symbols.ts`

Unit tests:

- LF and CRLF are handled.
- Comments and blank lines are ignored.
- Indented instructions produce an error.
- Trailing labels are parsed.
- Instructions are case-insensitive.
- Operand types are recognized: address, alias, immediate, jump target.
- Invalid labels and duplicate labels produce diagnostics with spans.

E2E: not applicable until the editor is connected.

#### A4. Assembler Encoder and Resolver

Deliverables:

- `core/assembler/encoder.ts`
- `core/assembler/resolver.ts`
- `core/assembler/diagnostics.ts`

Unit tests:

- `ld a` selects the address opcode.
- `ld 5` selects the immediate opcode.
- `st`, `in`, and `end` use the correct encodings.
- Forward references resolve correctly.
- Numeric line jumps resolve to memory addresses.
- Range limits are enforced for addresses, values, and program length.
- Warnings cover unreferenced labels, instructions after `end`, and conditional
  jumps without `cmp`.
- The generated object code matches golden fixtures.

E2E: not applicable until the editor and listing view exist.

#### A5. VM Core

Deliverables:

- `core/vm/cpu.ts`
- `core/vm/microops.ts`
- `core/vm/step.ts`
- `core/vm/traps.ts`
- `core/vm/disassembler.ts`

Unit tests:

- The VM loads a hand-written object program.
- Fetch, decode, and execute advance in the correct order.
- BZ advances by 2 for normal instructions and by 1 for `end`.
- Every opcode works with address and immediate operands where applicable.
- Conditional jumps cover every combination of VGL and opcode.
- A missing comparison produces `COMPARE_NOT_SET`.
- Division by zero, overflow, negative values, floor division, and modulo are
  covered.
- Memory and program-counter bounds produce traps.
- Input traps produce `input-required`.
- The disassembler reconstructs readable instructions.

E2E: not applicable until the controls and diagram exist.

### Stage B: First Vertical Slice

Goal: prove the full chain from editor to object code to VM to player to SVG.

Deliverables:

- Minimal application shell with toolbar, editor, machine diagram, and status bar.
- Minimal assembler support for `ld`, `add`, `out`, and `end`.
- Minimal VM execution for those instructions.
- Start, pause, step, and stop.
- Static SVG diagram with register and memory values.
- One example program.

Unit tests:

- The selected instructions assemble correctly.
- The VM executes the example and produces the expected registers and memory.
- Player transitions cover start, pause, step, stop, and finish.

Component tests:

- Toolbar buttons trigger the correct player commands.
- Status bar shows the current state.
- Register and memory values render correctly.

E2E tests:

- Load the example, assemble it, start it, pause it, step once, continue, and reach
  the end.
- Verify the final accumulator, output register, and memory values.
- Verify that invalid assembly does not start execution.

Acceptance:

- `ld 5; add 3; out a; end` works end to end.
- The UI never blocks the browser.
- The object program is visible or inspectable.

### Stage C: Complete Core

Implement the remaining instructions in small increments. Each increment gets unit
tests and one representative E2E program.

#### C1. Load, Store, Arithmetic

Instructions: `ld`, `st`, `add`, `sub`, `mul`, `div`, `mod`.

Unit tests:

- Address and immediate variants.
- Store writes the accumulator to memory.
- Division by zero and overflow traps.
- Floor division and modulo with negative values.

E2E: one program that loads, calculates, stores, and outputs values.

#### C2. Comparison and Jumps

Instructions: `cmp`, `jmp`, `jlt`, `jeq`, `jgt`.

Unit tests:

- VGL receives `<`, `=`, or `>`.
- Every conditional jump combination.
- A failed conditional jump leaves BZ at the next instruction.
- A successful jump updates BZ to the target address.
- A conditional jump without `cmp` traps.

E2E: a counting loop and a conditional branch.

#### C3. Input and Output

Instructions: `in`, `out`.

Unit tests:

- Input pauses execution and waits for a value.
- Valid input is written to memory.
- Out-of-range input is rejected.
- Output writes to AUS.
- Output stop pauses after `out`.

E2E: program requests input, receives a value, continues, and displays the output.

### Stage D: Full Editor and Diagram

#### D1. CodeMirror Editor

Deliverables:

- MOPS language highlighting.
- Line numbers.
- Current-line highlighting.
- Diagnostic markers.
- Breakpoint gutter.

Unit and component tests:

- Diagnostic ranges map to editor positions.
- Current-line changes follow player events.
- Breakpoint toggling updates the player state.
- Editor content changes mark the program as modified.

E2E tests:

- Type a valid program and assemble it.
- Type an invalid program and see the diagnostic on the correct line.
- Run a program and see the current line advance.
- Toggle a breakpoint and verify that execution stops there.

#### D2. Full SVG Diagram

Deliverables:

- All four machine units.
- All registers, buses, and memory cells.
- Active-state highlighting for every micro-op.
- Visual cue mapping.
- Responsive layout and fullscreen mode.

Unit tests:

- Layout functions produce stable coordinates.
- Visual mapping converts every micro-op into the expected cues.
- Value formatting handles positive, negative, and tuple values.

Component tests:

- Registers and memory cells render the correct values.
- Active flags produce the correct attributes or classes.
- The diagram remains accessible through titles and labels.

E2E and visual tests:

- FETCH state.
- DECODE state.
- EXECUTE state.
- Memory read and write.
- Input state.
- Error state.
- Breakpoint state.
- Desktop, tablet, and mobile screenshots.

jsdom cannot measure SVG layout. Geometry and visual behavior must be tested in
Playwright.

#### D3. Debug UI

Deliverables:

- Timeline and event log.
- Backward stepping.
- Listing view.
- Explanation panel.
- Input panel.

Unit tests:

- History snapshots restore the exact CPU state.
- Event grouping by phase and instruction.
- Listing entries match object-code addresses and words.
- Input validation.

Component tests:

- Timeline selection updates the displayed state.
- Backward-step controls follow history bounds.
- Explanation text follows the current micro-op.

E2E tests:

- Step through a program, click a history entry, and verify the state.
- Rewind to the beginning and run again.
- Verify the listing against the object program.
- Provide input through the input panel.

### Stage E: Persistence and Configuration

Deliverables:

- Open and save `.ass` files.
- UTF-8 and ISO-8859-15 import.
- Local storage autosave.
- `mops.cfg` import.
- Mnemonic settings.
- Unsaved-change protection.

Unit tests:

- Encoding and decoding of legacy files.
- Configuration validation: letters only, maximum length, unique mnemonics.
- Invalid configurations produce diagnostics.
- Imported object programs are validated.

E2E tests:

- Upload a `.ass` file and verify editor content.
- Download a program and verify file content.
- Import a configuration and assemble with a custom mnemonic.
- Verify unsaved-change confirmation.
- File System Access API paths are tested manually or in Chromium where available;
  the upload/download fallback is always covered.

### Stage F: Production Hardening

Deliverables:

- PWA manifest and service worker.
- Production base-path configuration.
- Development-route exclusion from production.
- Differential fixture corpus.
- CI pipeline.

Unit and build tests:

- Production build succeeds.
- Development marker is absent from `dist`.
- Manifest and icons are valid.
- Object-code and trace fixtures match the original implementation.

E2E tests:

- Production preview loads.
- `/dev/diagram` does not render the development harness in production.
- Offline reload works after the service worker is installed.
- Keyboard-only flow works.
- Reduced-motion mode disables non-essential animation.

## 5. Instruction Increment Matrix

| Increment | Instructions                      | Unit coverage                           | E2E flow                   |
| --------- | --------------------------------- | --------------------------------------- | -------------------------- |
| 1         | `ld`, `add`, `out`, `end`         | Address/immediate, execution, output    | Load, add, output, finish  |
| 2         | `st`, `sub`, `mul`, `div`, `mod`  | Store, arithmetic, traps                | Calculate and store values |
| 3         | `cmp`, `jmp`, `jlt`, `jeq`, `jgt` | VGL matrix, branch behavior, BZ updates | Counting loop and branch   |
| 4         | `in`                              | Input pause, validation, memory write   | Input and continue         |

E2E tests are added per increment, not per instruction. The full operand and trap
matrix belongs in unit tests.

## 6. Fixtures and Test Data

```text
fixtures/
  programs/        MOPS assembly programs
  object-code/     Expected memory images and listings
  traces/          Expected VM state after each microcycle
  config/          Valid and invalid mnemonic configurations
  files/           Legacy encodings and malformed files
```

Guidelines:

- Keep fixtures small and focused.
- Name fixtures after the behavior they prove.
- Reuse fixtures across unit and E2E tests where appropriate.
- Do not include original MOPS binaries or proprietary assets in the repository.
  Differential fixtures are generated locally or in a controlled CI job.

## 7. E2E Boundaries

E2E tests are required for:

- assembling and running a program,
- pause, step, continue, stop,
- input and output,
- breakpoints,
- editor diagnostics and current-line highlighting,
- timeline and backward stepping,
- listing view,
- responsive SVG states,
- file import/export fallback,
- production build and offline behavior.

E2E tests are not required for:

- ISA table completeness,
- individual assembler stages,
- individual micro-ops,
- arithmetic edge cases,
- every conditional-jump combination,
- serialization round-trips.

Those are cheaper and more precise as unit tests.

## 8. Quality Gates

- Core modules must have high branch coverage, especially assembler diagnostics and
  VM traps.
- Every opcode and every trap must have at least one unit test.
- Every player state transition must have a unit test.
- Every user-visible flow must have at least one E2E test.
- Visual states are covered by Playwright screenshots once the diagram is stable.
- Flaky tests are treated as defects, not retried indefinitely.

## 9. Recommended Order

1. Finish Stage A: ISA, object model, assembler, and VM with unit tests.
2. Build the Stage B vertical slice to establish E2E coverage early.
3. Complete the instruction set in the Stage C increments.
4. Add the full editor, diagram, and debug UI in Stage D.
5. Add persistence and configuration in Stage E.
6. Harden production behavior and differential tests in Stage F.
