#!/usr/bin/env node

/**
 * Fuzz Benchmark Script
 *
 * Emits newline-delimited JSON (JSONL) events to an output file as they happen.
 * Each line is a self-contained JSON object with an "event" field.
 *
 * Before each fuzzing run, the entire corpus is wiped and re-seeded from
 * testdata/ for a clean measurement.
 *
 * Events emitted:
 *   meta              - system/config info
 *   original_corpus   - stats from pre-existing corpus before any changes
 *   seed_corpus       - stats after seeding (one per run)
 *   regression        - one per regression suite run
 *   fuzz_sample       - each metric line from jazzer.js (time-series data)
 *   fuzz_run          - summary for one fuzzer run
 *   done              - benchmark complete
 *
 * Usage:
 *   node scripts/fuzz-benchmark.js [--duration 120] [--runs 3] [--output results.jsonl]
 */

import { spawn } from "child_process";
import { readdir, readFile, stat, rm, cp, writeFile, appendFile } from "fs/promises";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync, readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const CORPUS_DIR = join(ROOT, ".cifuzz-corpus");
const CORPUS_BACKUP = join(ROOT, ".cifuzz-corpus-backup");
const TESTDATA_DIR = join(ROOT, "testdata");

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

const fuzzTestFileExtension = ".fuzz.ts";

function parseJazzerLine(line) {
  const sample = {};

  const execMatch = line.match(/#(\d+)/);
  if (execMatch) sample.totalExecs = parseInt(execMatch[1]);

  const covMatch = line.match(/cov:\s*(\d+)/);
  if (covMatch) sample.coverage = parseInt(covMatch[1]);

  const ftMatch = line.match(/ft:\s*(\d+)/);
  if (ftMatch) sample.features = parseInt(ftMatch[1]);

  const corpMatch = line.match(/corp:\s*(\d+)/);
  if (corpMatch) sample.corpusSize = parseInt(corpMatch[1]);

  const execsMatch = line.match(/exec\/s:\s*(\d+)/);
  if (execsMatch) sample.execsPerSec = parseInt(execsMatch[1]);

  if (/\bNEW\b/.test(line)) sample.isNew = true;
  if (/\bpulse\b/.test(line)) sample.isPulse = true;
  if (/\bINIT\b/.test(line)) sample.isInit = true;

  if (sample.execsPerSec !== undefined) return sample;
  return null;
}

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

async function findLeafDirs(dir) {
  const leaves = [];
  const entries = await readdir(dir, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory());
  if (subdirs.length === 0) {
    leaves.push(dir);
  } else {
    for (const sub of subdirs) {
      leaves.push(...(await findLeafDirs(join(dir, sub.name))));
    }
  }
  return leaves;
}

async function findFuzzTests() {
  const fuzzDir = join(ROOT, "fuzz");
  const files = await readdir(fuzzDir);
  const tests = [];

  for (const file of files) {
    const filePath = join(fuzzDir, file);
    const stats = await stat(filePath);
    if (!stats.isFile() || !file.endsWith(fuzzTestFileExtension)) continue;

    const content = await readFile(filePath, "utf-8");
    const regex = /it\.fuzz\s*\(\s*['"]([\s\S]*?)['"]/g;
    for (const match of content.matchAll(regex)) {
      tests.push({
        file,
        name: match[1],
        path: filePath,
        shortName: basename(file, fuzzTestFileExtension),
      });
    }
  }
  return tests;
}

async function collectCorpusStats() {
  if (!existsSync(CORPUS_DIR)) return {};
  const stats = {};
  const dirs = await readdir(CORPUS_DIR);
  for (const dir of dirs) {
    const dirPath = join(CORPUS_DIR, dir);
    const dirStat = await stat(dirPath);
    if (!dirStat.isDirectory()) continue;
    const files = await findFiles(dirPath);
    let totalBytes = 0;
    for (const f of files) {
      const s = await stat(f);
      totalBytes += s.size;
    }
    stats[dir] = { files: files.length, totalBytes };
  }
  return stats;
}

// ── Corpus management ───────────────────────────────────────────────────────

async function backupCorpus() {
  if (!existsSync(CORPUS_DIR)) return false;
  if (existsSync(CORPUS_BACKUP)) {
    await rm(CORPUS_BACKUP, { recursive: true, force: true });
  }
  log("Backing up existing corpus...");
  await cp(CORPUS_DIR, CORPUS_BACKUP, { recursive: true });
  return true;
}

async function restoreCorpus() {
  if (!existsSync(CORPUS_BACKUP)) return;
  if (existsSync(CORPUS_DIR)) {
    await rm(CORPUS_DIR, { recursive: true, force: true });
  }
  log("Restoring original corpus...");
  await cp(CORPUS_BACKUP, CORPUS_DIR, { recursive: true });
  await rm(CORPUS_BACKUP, { recursive: true, force: true });
}

/**
 * Full corpus reset: nuke corpus, short init run to create dir structure,
 * wipe discovered inputs, copy only testdata seeds.
 */
async function fullCorpusReset() {
  if (existsSync(CORPUS_DIR)) {
    await rm(CORPUS_DIR, { recursive: true, force: true });
  }

  log("  Init run (5s) to create corpus dirs...");
  await new Promise((resolve) => {
    const child = spawn(
      "node",
      ["scripts/run-fuzzers.js", "--concurrent", "--duration", "5"],
      { cwd: ROOT, stdio: "pipe", shell: false },
    );
    child.stdout.on("data", () => {});
    child.stderr.on("data", () => {});
    child.on("exit", () => resolve());
  });

  // Let all child processes fully exit
  await new Promise((r) => setTimeout(r, 3000));

  if (!existsSync(CORPUS_DIR)) {
    log("  WARNING: corpus dir not created by init run");
    return {};
  }

  const entries = await readdir(CORPUS_DIR, { withFileTypes: true });
  const seedStats = {};

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith(".fuzz")) continue;

    const fuzzerName = entry.name;
    const format = fuzzerName.replace(".fuzz", "");
    const fuzzerDir = join(CORPUS_DIR, fuzzerName);
    const leafDirs = await findLeafDirs(fuzzerDir);

    let seeded = 0;

    for (const leafDir of leafDirs) {
      // Wipe init run discoveries
      const existing = await readdir(leafDir);
      for (const f of existing) {
        await rm(join(leafDir, f), { force: true });
      }

      // Copy seeds
      let seedDirs = [];
      if (format !== "parse" && existsSync(join(TESTDATA_DIR, format))) {
        seedDirs = [join(TESTDATA_DIR, format)];
      } else {
        const tdEntries = await readdir(TESTDATA_DIR, { withFileTypes: true });
        for (const td of tdEntries) {
          if (td.isDirectory() && td.name !== ".git") {
            seedDirs.push(join(TESTDATA_DIR, td.name));
          }
        }
      }

      for (const seedDir of seedDirs) {
        const files = await findFiles(seedDir);
        for (const file of files) {
          const content = await readFile(file);
          await writeFile(join(leafDir, `seed_${basename(file)}`), content);
          seeded++;
        }
      }
    }

    seedStats[fuzzerName] = seeded;
  }

  return seedStats;
}

// ── Fuzzer execution ────────────────────────────────────────────────────────

function runFuzzer(test, runIndex) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let firstExecTime = null;
    let peakRssKb = 0;
    let sampleCount = 0;
    let lastSample = null;
    const execRates = [];

    const env = {
      ...process.env,
      JAZZER_FUZZ: "1",
      JAZZER_TIMEOUT: "30000",
    };
    const jestConfig = join(ROOT, "jest.config.fuzz.js");

    const child = spawn(
      "npx",
      ["jest", "--config", jestConfig, test.path, "--testNamePattern", test.name],
      {
        env,
        stdio: ["inherit", "pipe", "pipe"],
        detached: process.platform !== "win32",
        shell: false,
      },
    );

    // Poll RSS via /proc
    const memInterval = setInterval(() => {
      try {
        const pid = child.pid;
        if (pid) {
          const procPath = `/proc/${pid}/status`;
          if (existsSync(procPath)) {
            const status = readFileSync(procPath, "utf-8");
            const vmRss = status.match(/VmRSS:\s+(\d+)/);
            if (vmRss) {
              const rss = parseInt(vmRss[1]);
              if (rss > peakRssKb) peakRssKb = rss;
            }
          }
        }
      } catch {
        // process may have exited
      }
    }, 2000);

    const handleOutput = (data) => {
      const text = data.toString();
      for (const line of text.split("\n")) {
        const sample = parseJazzerLine(line);
        if (sample) {
          const elapsed = (Date.now() - startTime) / 1000;
          sample.elapsedSec = Math.round(elapsed * 10) / 10;
          sampleCount++;
          lastSample = sample;
          if (sample.execsPerSec) execRates.push(sample.execsPerSec);

          if (firstExecTime === null) {
            firstExecTime = elapsed;
          }

          // Stream immediately
          emit({
            event: "fuzz_sample",
            fuzzer: test.shortName,
            run: runIndex,
            ...sample,
          });
        }
      }
    };

    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);

    const timeout = setTimeout(() => {
      try { process.kill(-child.pid, "SIGTERM"); } catch {}
      setTimeout(() => {
        try { process.kill(-child.pid, "SIGKILL"); } catch {}
      }, 5000);
    }, duration * 1000);

    child.on("exit", (code) => {
      clearTimeout(timeout);
      clearInterval(memInterval);

      const wallTime = (Date.now() - startTime) / 1000;
      const sorted = [...execRates].sort((a, b) => a - b);

      const summary = {
        event: "fuzz_run",
        fuzzer: test.shortName,
        run: runIndex,
        wallTimeSec: Math.round(wallTime * 10) / 10,
        exitCode: code,
        startupLatencySec: firstExecTime
          ? Math.round(firstExecTime * 10) / 10
          : null,
        peakRssKb,
        sampleCount,
        execsPerSec: {
          min: sorted.length ? sorted[0] : null,
          max: sorted.length ? sorted[sorted.length - 1] : null,
          median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
          last: sorted.length ? sorted[sorted.length - 1] : null,
        },
        finalCoverage: lastSample?.coverage ?? null,
        finalFeatures: lastSample?.features ?? null,
        finalCorpusSize: lastSample?.corpusSize ?? null,
      };

      emit(summary);
      resolve(summary);
    });
  });
}

function measureRegression(runIndex) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn("npx", ["jest", "--config", "jest.config.fuzz.js"], {
      cwd: ROOT,
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    });

    let output = "";
    child.stdout.on("data", (d) => (output += d.toString()));
    child.stderr.on("data", (d) => (output += d.toString()));

    child.on("exit", (code) => {
      const elapsed = (Date.now() - start) / 1000;
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed/);
      const suiteMatch = output.match(/Test Suites:\s+(\d+)\s+passed/);

      const result = {
        event: "regression",
        run: runIndex,
        wallTimeSec: Math.round(elapsed * 10) / 10,
        exitCode: code,
        testsPassed: testMatch ? parseInt(testMatch[1]) : null,
        suitesPassed: suiteMatch ? parseInt(suiteMatch[1]) : null,
      };

      emit(result);
      resolve(result);
    });
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

process.on("SIGINT", async () => {
  log("Interrupted — restoring corpus...");
  await restoreCorpus();
  process.exit(130);
});

async function main() {
  // Truncate output file
  await writeFile(outputPath, "");

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       Jazzer.js Fuzzing Baseline Benchmark      ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();
  log(`Duration per fuzzer: ${duration}s`);
  log(`Runs: ${runs}`);
  log(`Output: ${outputPath}`);
  console.log();

  // ── Meta ───────────────────────────────────────────────────────────────
  let jazzerVersion = null;
  try {
    const pkg = JSON.parse(
      await readFile(join(ROOT, "node_modules/@jazzer.js/jest-runner/package.json"), "utf-8"),
    );
    jazzerVersion = pkg.version;
  } catch {}

  await emit({
    event: "meta",
    tool: "jazzer.js",
    version: jazzerVersion,
    date: new Date().toISOString(),
    durationPerFuzzer: duration,
    runs,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  });

  // ── Original corpus stats ──────────────────────────────────────────────
  log("Capturing original corpus stats...");
  const origCorpus = await collectCorpusStats();
  await emit({ event: "original_corpus", ...origCorpus });
  for (const [name, stats] of Object.entries(origCorpus)) {
    log(`  ${name}: ${stats.files} files, ${(stats.totalBytes / 1024).toFixed(1)} KB`);
  }

  // ── Back up corpus ─────────────────────────────────────────────────────
  const hadCorpus = await backupCorpus();

  try {
    // ── Regression suite timing ────────────────────────────────────────
    log("── Regression Suite Timing ──");
    for (let i = 0; i < runs; i++) {
      log(`  Regression run ${i + 1}/${runs}...`);
      const reg = await measureRegression(i);
      log(`  → ${reg.wallTimeSec}s (exit=${reg.exitCode})`);
    }

    // ── Fuzzer throughput & coverage ────────────────────────────────────
    const tests = await findFuzzTests();
    log(`Found ${tests.length} fuzz targets`);

    for (let i = 0; i < runs; i++) {
      log(`\n══ Run ${i + 1}/${runs} ══`);

      // Full reset before every run
      log("Full corpus reset...");
      const seedStats = await fullCorpusReset();
      const corpusStats = await collectCorpusStats();
      await emit({ event: "seed_corpus", run: i, seeds: seedStats, corpus: corpusStats });

      for (const [name, count] of Object.entries(seedStats)) {
        log(`  ${name}: ${count} seeds`);
      }

      for (const test of tests) {
        log(`  [${test.shortName}] Starting (${duration}s)...`);
        const result = await runFuzzer(test, i);

        const med = result.execsPerSec.median;
        log(`  [${test.shortName}] exec/s: ${med ?? "?"} | cov: ${result.finalCoverage ?? "?"} | ft: ${result.finalFeatures ?? "?"} | corpus: ${result.finalCorpusSize ?? "?"}`);
        if (result.startupLatencySec !== null) {
          log(`  [${test.shortName}] startup: ${result.startupLatencySec}s | RSS: ${result.peakRssKb ? (result.peakRssKb / 1024).toFixed(1) + " MB" : "?"}`);
        }
        if (result.sampleCount === 0) {
          log(`  [${test.shortName}] WARNING: no metric samples captured!`);
        }
      }
    }

    await emit({ event: "done", date: new Date().toISOString() });
    log("Benchmark complete.");
  } finally {
    if (hadCorpus) {
      await restoreCorpus();
      log("Original corpus restored.");
    }
  }

  log(`Results: ${outputPath}`);
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  if (existsSync(CORPUS_BACKUP)) {
    await restoreCorpus();
  }
  process.exit(1);
});
