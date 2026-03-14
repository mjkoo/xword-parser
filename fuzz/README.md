# Fuzzing Tests

This directory contains fuzz tests for the xword-parser library using [Vitiate](https://github.com/mjkoo/vitiate), a coverage-guided fuzzing tool built as a Vitest plugin.

## Running Fuzz Tests

### Regression Mode (Quick Validation)

Replay corpus entries and crash regressions to ensure issues remain fixed:

```bash
npx vitiate regression
```

### Fuzzing Mode (Bug Discovery)

Actively generate and test new inputs to discover bugs:

```bash
# Run all fuzzers (default duration)
npx vitiate fuzz

# Run for 60 seconds
npx vitiate fuzz --fuzz-time 60

# Limit to N executions
npx vitiate fuzz --fuzz-execs 100000

# Stop after finding 3 crashes
npx vitiate fuzz --max-crashes 3
```

### Corpus Management

```bash
# Initialize seed directories for all fuzz tests
npx vitiate init

# Minimize corpus (remove redundant entries)
npx vitiate optimize
```

## Directory Structure

- `*.fuzz.ts` — Fuzz test harnesses (one per format + auto-detection)
- `../.vitiate/testdata/<hashdir>/seeds/` — Seed inputs (checked in)
- `../.vitiate/testdata/<hashdir>/crashes/` — Crash regressions (checked in)
- `../.vitiate/corpus/` — Discovered inputs (gitignored, rebuilt by fuzzer)

## What the Fuzzers Test

### Format-Specific Fuzzers

Each format has its own fuzzer (`puz.fuzz.ts`, `ipuz.fuzz.ts`, `jpz.fuzz.ts`, `xd.fuzz.ts`) that validates:

1. **Error Handling** — Only expected error types are thrown
2. **Data Integrity** — Parsed data maintains consistent structure
3. **Type Safety** — All properties have correct types
4. **No Crashes** — Parser handles malformed input gracefully

### Auto-Detection Fuzzer (`parse.fuzz.ts`)

Tests the main `parse()` function's auto-detection logic:

1. **Format Detection** — Tests with various input types and filename hints
2. **Encoding Options** — Validates different character encodings
3. **Error Consistency** — Ensures consistent error types across all code paths
4. **Unified Output** — Verifies all formats convert to valid unified structure

## Writing Fuzz Tests

Fuzz tests use the `fuzz()` function from `@vitiate/core`:

```typescript
import { fuzz } from "@vitiate/core";
import { expect } from "vitest";

fuzz("my fuzz test", (data: Buffer) => {
  // Parse the input
  const result = myParser(data.toString("utf-8"));

  // Validate invariants
  expect(result.width).toBeTypeOf("number");
  expect(result.width).toBeGreaterThan(0);
});
```

Since fuzz tests run inside Vitest, you can use `expect` from `vitest` directly for assertions.
