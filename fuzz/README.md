# Fuzzing Tests

This directory contains fuzz tests for the xword-parser library using [Jazzer.js](https://github.com/CodeIntelligenceTesting/jazzer.js).

## What is Fuzzing?

Fuzzing is an automated testing technique that generates random, invalid, or unexpected inputs to find bugs and vulnerabilities in code. The fuzzer monitors for crashes, assertion failures, and other unexpected behaviors.

## Setting Up Corpus Data

Seed the fuzzer corpus with test files for more effective fuzzing:

```bash
npm run fuzz:seed
```

This command:

- Automatically discovers all fuzzer corpus directories
- Copies relevant test files from `testdata/` to each fuzzer's corpus
- Format-specific fuzzers (ipuz, puz, jpz, xd) get only their matching format
- Generic fuzzers (parse) get all available test files
- Creates corpus directories if they don't exist

## Running Fuzz Tests

### Regression Mode (Quick Validation)

Run previously discovered test cases to ensure issues remain fixed:

```bash
npm run test:fuzz
```

### Fuzzing Mode (Bug Discovery)

Actively generate and test new inputs to discover bugs:

```bash
# Run all fuzzers sequentially for 5 minutes each (default)
npm run fuzz

# Run all fuzzers concurrently for 5 minutes each
npm run fuzz:concurrent

# Quick test - run for 1 minute each
npm run fuzz:quick
```

### Custom Duration and Timeout

You can also run the fuzzer script directly with custom options:

```bash
node scripts/run-fuzzers.js --duration 600  # 10 minutes each
node scripts/run-fuzzers.js --concurrent --duration 120  # 2 minutes each, concurrent

# Adjust jazzer.js execution timeout (default: 30000ms)
node scripts/run-fuzzers.js --jazzer-timeout 60000  # 60 second timeout per test
```

#### Timeout Configuration

The fuzzer uses two different timeouts:
- **Duration timeout**: How long to run each fuzzer (default: 300 seconds)
- **Jazzer.js timeout**: Maximum time for a single test execution (default: 30000ms)

If you see timeout findings in your fuzzer output, you can increase the jazzer.js timeout:
```bash
# Use a more relaxed timeout for complex inputs
export JAZZER_TIMEOUT=60000
npm run fuzz

# Or use the command line option
node scripts/run-fuzzers.js --jazzer-timeout 60000
```

## What the Fuzzers Test

### Format-Specific Fuzzers

Each format has its own fuzzer that validates:

1. **Error Handling** - Only expected error types are thrown
2. **Data Integrity** - Parsed data maintains consistent structure
3. **Type Safety** - All properties have correct types
4. **No Crashes** - Parser handles malformed input gracefully

### Auto-Detection Fuzzer (`parse.fuzz.ts`)

Tests the main `parse()` function's auto-detection logic:

1. **Format Detection** - Tests with various input types and filename hints
2. **Encoding Options** - Validates different character encodings
3. **Error Consistency** - Ensures consistent error types across all code paths
4. **Unified Output** - Verifies all formats convert to valid unified structure

## Fuzzer Output

- **Regression mode**: Quick pass/fail for known test cases
- **Fuzzing mode**:
  - Shows coverage statistics and execution speed
  - Saves interesting inputs to `.cifuzz-corpus/` for future runs
  - Reports crashes in `.cifuzz-findings/` directory
  - Generates logs in `fuzz-*.log` files when using the runner script

## Interpreting Results

- `cov`: Code coverage (higher is better)
- `ft`: Features/edges covered (higher is better)
- `corp`: Corpus size (number of interesting test cases found)
- `exec/s`: Executions per second (higher means faster testing)
- `NEW`: Found a new code path
- `pulse`: Periodic status update

## Files

- `*.fuzz.ts` - Fuzz test files for each format
- `run-fuzzers.js` - Node.js script to run fuzzers with timeouts
- `globals.d.ts` - TypeScript type definitions for Jazzer.js
- `../jest.config.fuzz.js` - Jest configuration for fuzz tests
