#!/usr/bin/env node

/**
 * Convert Vitest benchmark JSON output to github-action-benchmark format
 * 
 * Vitest outputs a complex nested structure, but github-action-benchmark
 * expects a simple array of objects with name, unit, and value.
 */

import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2] || 'bench-results.json';
const outputFile = process.argv[3] || 'bench-results-converted.json';

if (!fs.existsSync(inputFile)) {
  console.error(`Input file ${inputFile} not found`);
  process.exit(1);
}

try {
  const vitestResults = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const convertedResults = [];

  // Extract benchmarks from Vitest's nested structure
  if (vitestResults.files && Array.isArray(vitestResults.files)) {
    for (const file of vitestResults.files) {
      if (file.groups && Array.isArray(file.groups)) {
        for (const group of file.groups) {
          if (group.benchmarks && Array.isArray(group.benchmarks)) {
            for (const benchmark of group.benchmarks) {
              // Use hz (operations per second) as the primary metric
              // Higher hz is better for performance benchmarks
              convertedResults.push({
                name: benchmark.name,
                unit: 'ops/sec',
                value: benchmark.hz || 0,
                range: benchmark.rme ? `±${benchmark.rme.toFixed(2)}%` : undefined,
                extra: [
                  `Mean: ${benchmark.mean?.toFixed(4)}ms`,
                  `Min: ${benchmark.min?.toFixed(4)}ms`,
                  `Max: ${benchmark.max?.toFixed(4)}ms`,
                  `P75: ${benchmark.p75?.toFixed(4)}ms`,
                  `P99: ${benchmark.p99?.toFixed(4)}ms`,
                  `Samples: ${benchmark.samples?.length || benchmark.sampleCount || 0}`
                ].filter(Boolean).join('\n')
              });
            }
          }
        }
      }
    }
  }

  // Write the converted results
  fs.writeFileSync(outputFile, JSON.stringify(convertedResults, null, 2));
  console.log(`Converted ${convertedResults.length} benchmark results`);
  console.log(`Output written to ${outputFile}`);

} catch (error) {
  console.error('Error converting benchmark results:', error);
  process.exit(1);
}