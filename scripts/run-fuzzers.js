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
const fuzzTestNameRegex = /it\.fuzz\s*\(\s*['"](.*)['"], /g;

// Track running processes for cleanup on script termination
const runningProcesses = new Set();

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
async function findFuzzTestNamesInFile(filePath) {
  const fuzzTestNames = [];
  if (filePath.endsWith(fuzzTestFileExtension)) {
    const content = await readFile(filePath);
    for (let match of content.toString().matchAll(fuzzTestNameRegex)) {
      fuzzTestNames.push(match[1]);
    }
  }
  return fuzzTestNames;
}

/**
 * Kill process tree on Unix-like systems
 */
function killProcessTree(pid, signal = 'SIGTERM') {
  try {
    // On Unix, kill the process group
    process.kill(-pid, signal);
  } catch (e) {
    // Process might already be dead
  }
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
        // Use detached to create a new process group on Unix
        detached: process.platform !== 'win32',
        // Don't use shell to avoid extra process layer
        shell: false,
      },
    );

    runningProcesses.add(child);
    const shortName = basename(file, fuzzTestFileExtension);
    let killed = false;

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
        killed = true;
        log(`Stopping ${file} > ${testName} (timeout after ${duration} seconds)`, 'yellow');

        // Try graceful shutdown first
        killProcessTree(child.pid, 'SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (child.killed === false) {
            killProcessTree(child.pid, 'SIGKILL');
          }
        }, 5000);
      }, duration * 1000);
    }

    child.on('exit', (code, signal) => {
      if (timeout) clearTimeout(timeout);
      runningProcesses.delete(child);

      if (killed) {
        log(`✓ ${file} > ${testName} completed (${duration} seconds timeout)`, 'green');
      } else if (code === 0) {
        log(`✓ ${file} > ${testName} completed successfully`, 'green');
      } else if (code !== null) {
        log(`✗ ${file} > ${testName} failed with exit code ${code}`, 'red');
      } else if (signal) {
        log(`✗ ${file} > ${testName} terminated by signal ${signal}`, 'red');
      }
      resolve({ file, testName, code: killed ? 0 : code });
    });
  });
}

/**
 * Find all fuzz tests in fuzz directory
 */
async function findFuzzTestsInDir() {
  const fuzzDir = join(__dirname, '..', 'fuzz');
  const { stat } = await import('fs/promises');
  const files = await readdir(fuzzDir);
  const fuzzTests = {};

  for (const file of files) {
    const filePath = join(fuzzDir, file);
    const stats = await stat(filePath);

    // Only process files, not directories
    if (stats.isFile() && file.endsWith(fuzzTestFileExtension)) {
      const testNames = await findFuzzTestNamesInFile(filePath);
      if (testNames.length) {
        fuzzTests[filePath] = testNames;
      }
    }
  }

  return fuzzTests;
}

// Simple cleanup handler for script termination
process.on('SIGINT', () => {
  for (const child of runningProcesses) {
    killProcessTree(child.pid, 'SIGKILL');
  }
  process.exit(130);
});

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
      for (const [filePath, testNames] of Object.entries(fuzzTests)) {
        for (const testName of testNames) {
          const file = basename(filePath);
          promises.push(executeFuzzTest(file, testName, filePath));
        }
      }
      results = await Promise.all(promises);
    } else {
      // Run fuzzers sequentially
      for (const [filePath, testNames] of Object.entries(fuzzTests)) {
        for (const testName of testNames) {
          const file = basename(filePath);
          const result = await executeFuzzTest(file, testName, filePath);
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
    const findingsDir = join(__dirname, '..', '.cifuzz-findings');
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
