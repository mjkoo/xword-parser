#!/usr/bin/env node

/**
 * Fuzz Benchmark Script
 *
 * Emits newline-delimited JSON (JSONL) events to an output file as they happen.
 * Each line is a self-contained JSON object with an "event" field.
 *
 * Uses vitiate CLI to run each fuzz target independently.
 *
 * Before each fuzzing run, the generated corpus is wiped (seeds are preserved).
 *
 * Events emitted:
 *   meta              - system/config info
 *   seed_corpus       - stats after seeding (one per run)
 *   regression        - one per regression suite run
 *   fuzz_sample       - each status line from vitiate (time-series data)
 *   fuzz_run          - summary for one fuzzer run
 *   done              - benchmark complete
 *
 * Usage:
 *   node scripts/fuzz-benchmark.js [--duration 120] [--runs 3] [--output results.jsonl]
 */

import { spawn, spawnSync } from "child_process";
import { readdir, readFile, stat, rm, mkdir, copyFile, writeFile, appendFile } from "fs/promises";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const VITIATE_DIR = join(ROOT, ".vitiate");
const CORPUS_DIR = join(VITIATE_DIR, "corpus");
const VITIATE_TESTDATA_DIR = join(VITIATE_DIR, "testdata");
const PUZZLE_TESTDATA_DIR = join(ROOT, "testdata");
const FUZZ_DIR = join(ROOT, "fuzz");

const FORMATS = ["ipuz", "puz", "jpz", "xd", "parse"];

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let duration = 120;
let runs = 3;
let outputPath = join(ROOT, "fuzz-benchmark-results.jsonl");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--duration" && args[i + 1]) {
    duration = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--runs" && args[i + 1]) {
    runs = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--output" && args[i + 1]) {
    outputPath = args[i + 1];
    i++;
  } else if (args[i] === "--help") {
    console.log(
      "Usage: node scripts/fuzz-benchmark.js [--duration 120] [--runs 3] [--output results.jsonl]",
    );
    console.log("  --duration   Seconds per fuzzer per run (default: 120)");
    console.log("  --runs       Number of runs to average (default: 3)");
    console.log("  --output     Output JSONL path (default: fuzz-benchmark-results.jsonl)");
    process.exit(0);
  }
}

// ── JSONL output ────────────────────────────────────────────────────────────

async function emit(event) {
  const line = JSON.stringify(event) + "\n";
  await appendFile(outputPath, line);
}

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function findFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findFiles(full)));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Parse a vitiate periodic status line.
 *
 * Format: fuzz: elapsed: 42s, execs: 1234567 (29300/sec), cal: 500, corpus: 456 (12 new), edges: 1890, ft: 2500
 */
function parseVitiateStatusLine(line) {
  const match = line.match(
    /^fuzz: elapsed: (\d+)s, execs: (\d+) \((\d+)\/sec\), cal: (\d+), corpus: (\d+) \((\d+) new\), edges: (\d+), ft: (\d+)$/,
  );
  if (match) {
    return {
      elapsedSec: parseInt(match[1]),
      totalExecs: parseInt(match[2]),
      execsPerSec: parseInt(match[3]),
      calibrationExecs: parseInt(match[4]),
      corpusSize: parseInt(match[5]),
      newCorpus: parseInt(match[6]),
      edges: parseInt(match[7]),
      features: parseInt(match[8]),
    };
  }
  return null;
}

/**
 * Parse a vitiate summary line.
 *
 * Format: fuzz: done - execs: 5000000, cal: 1000, corpus: 1200, edges: 3400, ft: 5000, elapsed: 180.5s
 */
function parseVitiateDoneLine(line) {
  const match = line.match(
    /fuzz: done - execs: (\d+), cal: (\d+), corpus: (\d+), edges: (\d+), ft: (\d+), elapsed: ([\d.]+)s/,
  );
  if (match) {
    return {
      totalExecs: parseInt(match[1]),
      calibrationExecs: parseInt(match[2]),
      corpusSize: parseInt(match[3]),
      edges: parseInt(match[4]),
      features: parseInt(match[5]),
      elapsedSec: parseFloat(match[6]),
    };
  }
  return null;
}

function findFuzzTests() {
  return FORMATS.map((name) => ({
    shortName: name,
    targetPath: join(FUZZ_DIR, `${name}.fuzz.ts`),
  }));
}

// ── Corpus management ───────────────────────────────────────────────────────

async function fullCorpusReset() {
  // 1. Wipe generated corpus
  if (existsSync(CORPUS_DIR)) {
    await rm(CORPUS_DIR, { recursive: true, force: true });
  }
  await mkdir(CORPUS_DIR, { recursive: true });

  // 2. Clear seed files (preserving .formats) and re-seed from testdata/
  const seedStats = {};

  if (!existsSync(VITIATE_TESTDATA_DIR)) return seedStats;

  const dirs = await readdir(VITIATE_TESTDATA_DIR, { withFileTypes: true });
  for (const entry of dirs) {
    if (!entry.isDirectory()) continue;
    const seedDir = join(VITIATE_TESTDATA_DIR, entry.name, "seeds");
    if (!existsSync(seedDir)) continue;

    // Read .formats to know which puzzle formats this test needs
    const formatsFile = join(seedDir, ".formats");
    if (!existsSync(formatsFile)) continue;
    const formats = (await readFile(formatsFile, "utf-8"))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // Clear existing seed files (keep dotfiles like .formats)
    const existing = await readdir(seedDir);
    for (const f of existing) {
      if (f.startsWith(".")) continue;
      await rm(join(seedDir, f), { force: true });
    }

    // Copy seed files from testdata/<format>/
    let seeded = 0;
    for (const fmt of formats) {
      const srcDir = join(PUZZLE_TESTDATA_DIR, fmt);
      if (!existsSync(srcDir)) continue;

      const srcEntries = await readdir(srcDir, { withFileTypes: true });
      for (const srcEntry of srcEntries) {
        if (!srcEntry.isFile()) continue;
        await copyFile(join(srcDir, srcEntry.name), join(seedDir, srcEntry.name));
        seeded++;
      }
    }

    seedStats[entry.name] = { files: seeded, formats };
  }

  return seedStats;
}

// ── Fuzzer execution ────────────────────────────────────────────────────────

async function runFuzzer(test, runIndex) {
  const startTime = Date.now();
  const resultsFile = join(tmpdir(), `vitiate-bench-${test.shortName}-${runIndex}-${Date.now()}.json`);

  // Use spawnSync to avoid pipe draining race conditions — vitest's fork pool
  // may not flush the child's stderr before exiting when using async spawn.
  // VITIATE_RESULTS_FILE provides a reliable fallback for final stats.
  const result = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", test.targetPath],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        VITIATE_FUZZ: "1",
        VITIATE_FUZZ_TIME: String(duration),
        VITIATE_RESULTS_FILE: resultsFile,
        NO_COLOR: "1",
      },
      stdio: ["inherit", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
      timeout: (duration + 30) * 1000,
      shell: false,
    },
  );

  const wallTime = (Date.now() - startTime) / 1000;
  const output = (result.stdout?.toString() ?? "") + "\n" + (result.stderr?.toString() ?? "");

  // Parse periodic status lines from stderr for time-series data
  let sampleCount = 0;
  let lastSample = null;
  let doneSummary = null;
  let crashes = 0;
  const execRates = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("fuzz: CRASH FOUND:")) {
      crashes++;
    }

    const sample = parseVitiateStatusLine(trimmed);
    if (sample) {
      sampleCount++;
      lastSample = sample;
      if (sample.execsPerSec) execRates.push(sample.execsPerSec);

      await emit({
        event: "fuzz_sample",
        fuzzer: test.shortName,
        run: runIndex,
        ...sample,
      });
      continue;
    }

    const done = parseVitiateDoneLine(trimmed);
    if (done) {
      doneSummary = done;
    }
  }

  // Read the results file as authoritative source (bypasses stderr flush race)
  let resultsData = null;
  try {
    resultsData = JSON.parse(readFileSync(resultsFile, "utf-8"));
    unlinkSync(resultsFile);
  } catch {
    // Results file may not exist if fuzzer crashed early
  }

  const sorted = [...execRates].sort((a, b) => a - b);

  // Prefer results file, fall back to stderr parsing
  const finalExecs = resultsData?.totalExecs ?? doneSummary?.totalExecs ?? lastSample?.totalExecs ?? null;
  const finalEdges = resultsData?.coverageEdges ?? doneSummary?.edges ?? lastSample?.edges ?? null;
  const finalFeatures = resultsData?.coverageFeatures ?? doneSummary?.features ?? lastSample?.features ?? null;
  const finalCorpusSize = resultsData?.corpusSize ?? doneSummary?.corpusSize ?? lastSample?.corpusSize ?? null;
  const finalCalibrationExecs = resultsData?.calibrationExecs ?? doneSummary?.calibrationExecs ?? null;
  const fuzzElapsedMs = resultsData?.elapsedMs ?? null;
  const fuzzElapsedSec = fuzzElapsedMs !== null ? fuzzElapsedMs / 1000 : doneSummary?.elapsedSec ?? null;

  const startupLatency = fuzzElapsedSec !== null
    ? Math.round((wallTime - fuzzElapsedSec) * 10) / 10
    : null;

  const summary = {
    event: "fuzz_run",
    fuzzer: test.shortName,
    run: runIndex,
    wallTimeSec: Math.round(wallTime * 10) / 10,
    exitCode: result.status,
    startupLatencySec: startupLatency,
    sampleCount,
    crashes: resultsData?.crashCount ?? crashes,
    execsPerSec: {
      min: sorted.length ? sorted[0] : null,
      max: sorted.length ? sorted[sorted.length - 1] : null,
      median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      last: sorted.length ? sorted[sorted.length - 1] : null,
    },
    finalExecs,
    finalCalibrationExecs,
    finalEdges,
    finalFeatures,
    finalCorpusSize,
  };

  await emit(summary);
  return summary;
}

function measureRegression(runIndex) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn("pnpm", ["exec", "vitiate", "regression"], {
      cwd: ROOT,
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    });

    let output = "";
    child.stdout.on("data", (d) => (output += d.toString()));
    child.stderr.on("data", (d) => (output += d.toString()));

    child.on("exit", (code) => {
      const elapsed = (Date.now() - start) / 1000;
      const testMatch = output.match(/(\d+)\s+passed/);
      const failMatch = output.match(/(\d+)\s+failed/);

      const result = {
        event: "regression",
        run: runIndex,
        wallTimeSec: Math.round(elapsed * 10) / 10,
        exitCode: code,
        testsPassed: testMatch ? parseInt(testMatch[1]) : null,
        testsFailed: failMatch ? parseInt(failMatch[1]) : null,
      };

      emit(result);
      resolve(result);
    });
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  await writeFile(outputPath, "");

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║        Vitiate Fuzzing Baseline Benchmark       ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();
  log(`Duration per fuzzer: ${duration}s`);
  log(`Runs: ${runs}`);
  log(`Output: ${outputPath}`);
  log(`Mode: vitiate (vitest plugin)`);
  console.log();

  // ── Meta ───────────────────────────────────────────────────────────────
  let vitiateVersion = null;
  try {
    const pkg = JSON.parse(
      await readFile(join(ROOT, "node_modules/vitiate/package.json"), "utf-8"),
    );
    vitiateVersion = pkg.version;
  } catch {}

  let vitiateCoreVersion = null;
  try {
    const pkg = JSON.parse(
      await readFile(join(ROOT, "node_modules/@vitiate/core/package.json"), "utf-8"),
    );
    vitiateCoreVersion = pkg.version;
  } catch {}

  await emit({
    event: "meta",
    tool: "vitiate",
    version: vitiateVersion,
    coreVersion: vitiateCoreVersion,
    date: new Date().toISOString(),
    durationPerFuzzer: duration,
    runs,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  });

  // ── Regression suite timing ────────────────────────────────────────
  log("── Regression Suite Timing ──");
  for (let i = 0; i < runs; i++) {
    log(`  Regression run ${i + 1}/${runs}...`);
    const reg = await measureRegression(i);
    log(`  → ${reg.wallTimeSec}s (exit=${reg.exitCode})`);
  }

  // ── Fuzzer throughput & coverage ────────────────────────────────────
  const tests = findFuzzTests();
  log(`Found ${tests.length} fuzz targets`);

  for (let i = 0; i < runs; i++) {
    log(`\n══ Run ${i + 1}/${runs} ══`);

    log("Full corpus reset & re-seed...");
    const seedStats = await fullCorpusReset();
    await emit({ event: "seed_corpus", run: i, seeds: seedStats });

    for (const [name, info] of Object.entries(seedStats)) {
      log(`  ${name}: ${info.files} seeds (${info.formats.join(", ")})`);
    }

    for (const test of tests) {
      log(`  [${test.shortName}] Starting (${duration}s)...`);
      const result = await runFuzzer(test, i);

      const med = result.execsPerSec.median;
      log(`  [${test.shortName}] exec/s: ${med ?? "?"} | edges: ${result.finalEdges ?? "?"} | ft: ${result.finalFeatures ?? "?"} | corpus: ${result.finalCorpusSize ?? "?"}`);
      if (result.finalCalibrationExecs) {
        log(`  [${test.shortName}] cal: ${result.finalCalibrationExecs} (${Math.round((result.finalCalibrationExecs / (result.finalExecs || 1)) * 100)}% of execs)`);
      }
      if (result.startupLatencySec !== null) {
        log(`  [${test.shortName}] startup: ${result.startupLatencySec}s`);
      }
      if (result.finalEdges === null && result.sampleCount === 0) {
        log(`  [${test.shortName}] WARNING: no metrics captured!`);
      }
    }
  }

  await emit({ event: "done", date: new Date().toISOString() });
  log("Benchmark complete.");
  log(`Results: ${outputPath}`);
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
