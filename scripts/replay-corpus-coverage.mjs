#!/usr/bin/env node

/**
 * Replay a fuzz corpus through xword-parser and measure V8 coverage.
 *
 * Usage:
 *   npx c8 --src src --all node scripts/replay-corpus-coverage.mjs \
 *     --format ipuz --corpus .vitiate/corpus/<hash>/
 *
 *   npx c8 --src src --all node scripts/replay-corpus-coverage.mjs \
 *     --format ipuz --corpus .fuzz-corpus-bench/ipuz/
 *
 * Formats: ipuz, puz, jpz, xd, parse
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// Import from source (tsx) or dist (node), depending on runtime
let lib;
try {
  lib = await import(join(ROOT, "src/index.ts"));
} catch {
  lib = await import(join(ROOT, "dist/index.mjs"));
}

const {
  parse,
  parseIpuz, convertIpuzToUnified,
  parsePuz, convertPuzToUnified,
  parseJpz, convertJpzToUnified,
  parseXd, convertXdToUnified,
  ParseError,
} = lib;

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let format = null;
let corpusDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--format" && args[i + 1]) { format = args[i + 1]; i++; }
  else if (args[i] === "--corpus" && args[i + 1]) { corpusDir = resolve(args[i + 1]); i++; }
}

if (!format || !corpusDir) {
  console.error("Usage: node scripts/replay-corpus-coverage.mjs --format <ipuz|puz|jpz|xd|parse> --corpus <dir>");
  process.exit(1);
}

// ── Replay functions per format ──────────────────────────────────────────────

function replayIpuz(data) {
  const input = data.toString("utf-8");
  const parsed = parseIpuz(input);
  convertIpuzToUnified(parsed);
}

function replayPuz(data) {
  const parsed = parsePuz(data);
  convertPuzToUnified(parsed);
}

function replayJpz(data) {
  const input = data.toString("utf-8");
  const parsed = parseJpz(input);
  convertJpzToUnified(parsed);
}

function replayXd(data) {
  const input = data.toString("utf-8");
  const parsed = parseXd(input);
  convertXdToUnified(parsed);
}

function replayParse(data) {
  // Mirrors the jazzer parse.cjs target: try multiple input combos
  const str = data.toString("utf-8");
  const attempts = [
    [str, undefined],
    [str, { filename: "puzzle.puz" }],
    [str, { filename: "puzzle.ipuz" }],
    [str, { filename: "puzzle.jpz" }],
    [str, { filename: "puzzle.xd" }],
    [data, undefined],
    [data, { filename: "puzzle.puz" }],
  ];
  for (const [input, opts] of attempts) {
    try {
      parse(input, opts);
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
    }
  }
}

const replayFn = {
  ipuz: replayIpuz,
  puz: replayPuz,
  jpz: replayJpz,
  xd: replayXd,
  parse: replayParse,
}[format];

if (!replayFn) {
  console.error(`Unknown format: ${format}`);
  process.exit(1);
}

// ── Collect files ────────────────────────────────────────────────────────────

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

const files = collectFiles(corpusDir);
console.log(`Replaying ${files.length} corpus files for format=${format}`);

// ── Replay ───────────────────────────────────────────────────────────────────

let succeeded = 0;
let errored = 0;
let unexpected = 0;

for (const file of files) {
  const data = readFileSync(file);
  try {
    replayFn(data);
    succeeded++;
  } catch (e) {
    if (e instanceof ParseError) {
      errored++;
    } else {
      unexpected++;
      // Don't abort — we want maximum coverage
    }
  }
}

console.log(`Results: ${succeeded} parsed, ${errored} expected errors, ${unexpected} unexpected errors`);
