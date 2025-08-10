#!/usr/bin/env node

/**
 * Run fuzzers in fuzzing mode for a specified duration
 * Based on jazzer.js reference implementation with added timeout support
 *
 * Copyright 2023 Code Intelligence GmbH (original runFuzzTests.js)
 * Modified to add timeout/duration support and ES modules
 */

import { spawn } from 'child_process';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fuzzTestFileExtension = '.fuzz.ts';
const fuzzTestNameRegex = /it\.fuzz\s*\(\s*"(.*)"/g;

// Parse command line arguments
const args = process.argv.slice(2);
let concurrent = false;
let duration = 300; // 5 minutes in seconds

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--concurrent') {
    concurrent = true;
  } else if (args[i] === '--duration' && args[i + 1]) {
    duration = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--help') {
    console.log('Usage: node run-fuzzers.js [--concurrent] [--duration seconds]');
    console.log('  --concurrent  Run all fuzzers concurrently');
    console.log('  --duration    Duration in seconds (default: 300)');
    process.exit(0);
  }
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Find fuzz test names in a file
 */
async function findFuzzTestNamesInFile(file) {
  const fuzzTestNames = [];
  if (file.endsWith(fuzzTestFileExtension)) {
    const content = await readFile(join(__dirname, file));
    for (let match of content.toString().matchAll(fuzzTestNameRegex)) {
      fuzzTestNames.push(match[1]);
    }
  }
  return fuzzTestNames;
}

/**
 * Execute a single fuzz test with optional timeout
 */
function executeFuzzTest(file, testName, testFile) {
  return new Promise((resolve) => {
    log(`Starting fuzzer: ${file} > ${testName}`, 'yellow');

    const env = { ...process.env, JAZZER_FUZZ: '1' };
    const jestConfig = join(__dirname, '..', 'jest.config.fuzz.js');

    const child = spawn(
      'npx',
      ['jest', '--config', jestConfig, testFile, '--testNamePattern', testName],
      {
        env,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      },
    );

    const shortName = basename(file, fuzzTestFileExtension);

    child.stdout.on('data', (data) => {
      process.stdout.write(`[${shortName}] ${data}`);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(`[${shortName}] ${data}`);
    });

    // Set timeout to kill the process after duration
    let timeout;
    if (duration > 0) {
      timeout = setTimeout(() => {
        child.kill('SIGKILL');
        log(`✓ ${file} > ${testName} completed (${duration} seconds)`, 'green');
      }, duration * 1000);
    }

    child.on('exit', (code) => {
      if (timeout) clearTimeout(timeout);
      if (code === 0) {
        log(`✓ ${file} > ${testName} completed successfully`, 'green');
      } else if (code !== null) {
        log(`✗ ${file} > ${testName} failed with exit code ${code}`, 'red');
      }
      resolve({ file, testName, code });
    });
  });
}

/**
 * Find all fuzz tests in directory
 */
async function findFuzzTestsInDir() {
  const files = await readdir(__dirname);
  const fuzzTests = {};

  for (const file of files) {
    const testNames = await findFuzzTestNamesInFile(file);
    if (testNames.length) {
      fuzzTests[file] = testNames;
    }
  }

  return fuzzTests;
}

/**
 * Main function
 */
async function main() {
  if (duration > 0) {
    log(`Running fuzzers for ${duration} seconds each...`);
  } else {
    log(`Running fuzzers until completion...`);
  }
  log(`Mode: ${concurrent ? 'Concurrent' : 'Sequential'}\n`);

  try {
    const fuzzTests = await findFuzzTestsInDir();

    if (Object.keys(fuzzTests).length === 0) {
      log('No fuzz test files found!', 'red');
      process.exit(1);
    }

    let results = [];

    if (concurrent) {
      // Run all fuzzers concurrently
      log('Starting all fuzzers concurrently...\n');
      const promises = [];
      for (const [file, testNames] of Object.entries(fuzzTests)) {
        for (const testName of testNames) {
          promises.push(executeFuzzTest(file, testName, join(__dirname, file)));
        }
      }
      results = await Promise.all(promises);
    } else {
      // Run fuzzers sequentially
      for (const [file, testNames] of Object.entries(fuzzTests)) {
        for (const testName of testNames) {
          const result = await executeFuzzTest(file, testName, join(__dirname, file));
          results.push(result);
        }
      }
    }

    // Summary
    log('\nFuzzing complete!');

    const failed = results.filter((r) => r.code !== 0 && r.code !== null);
    if (failed.length > 0) {
      log(`${failed.length} fuzzer(s) reported issues`, 'yellow');
      process.exitCode = 1;
    } else {
      log('All fuzzers completed successfully', 'green');
    }

    // Check for crashes
    const { existsSync, readdirSync } = await import('fs');
    const findingsDir = join(__dirname, '.cifuzz-findings');
    if (existsSync(findingsDir)) {
      const findings = readdirSync(findingsDir);
      if (findings.length > 0) {
        log('\nCrashes found! Check .cifuzz-findings/ directory', 'red');
      }
    } else {
      log('\nNo crashes found during fuzzing.', 'green');
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  log(`Unexpected error: ${error}`, 'red');
  process.exit(1);
});
