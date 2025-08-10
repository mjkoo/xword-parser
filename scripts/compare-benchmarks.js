#!/usr/bin/env node

/**
 * Compare benchmark results between branches or commits
 * Usage: node scripts/compare-benchmarks.js [base-branch] [current-branch]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const baseBranch = process.argv[2] || 'main';
const currentBranch = process.argv[3] || 'HEAD';

console.log(`Comparing benchmarks: ${baseBranch} vs ${currentBranch}\n`);

// Save current branch
const originalBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

try {
  // Run benchmarks on current branch
  console.log(`Running benchmarks on ${currentBranch}...`);
  execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' });
  execSync('npm ci', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  execSync('npm run bench:ci', { stdio: 'inherit' });
  
  const currentResults = JSON.parse(fs.readFileSync('bench-results.json', 'utf8'));
  
  // Run benchmarks on base branch
  console.log(`\nRunning benchmarks on ${baseBranch}...`);
  execSync(`git checkout ${baseBranch}`, { stdio: 'inherit' });
  execSync('npm ci', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  execSync('npm run bench:ci', { stdio: 'inherit' });
  
  const baseResults = JSON.parse(fs.readFileSync('bench-results.json', 'utf8'));
  
  // Compare results
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK COMPARISON RESULTS');
  console.log('='.repeat(80) + '\n');
  
  const comparison = [];
  
  (currentResults.results || []).forEach(currentTest => {
    const baseTest = (baseResults.results || []).find(b => b.name === currentTest.name);
    
    if (baseTest && baseTest.hz && currentTest.hz) {
      const diff = ((currentTest.hz - baseTest.hz) / baseTest.hz) * 100;
      const improved = diff > 0;
      const significant = Math.abs(diff) > 5; // 5% threshold for significance
      
      comparison.push({
        name: currentTest.name,
        base: baseTest.hz,
        current: currentTest.hz,
        diff: diff,
        improved: improved,
        significant: significant
      });
    }
  });
  
  // Sort by absolute difference
  comparison.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  
  // Print results
  console.log('Significant changes (>5% difference):');
  console.log('-'.repeat(80));
  
  const significant = comparison.filter(c => c.significant);
  if (significant.length === 0) {
    console.log('No significant performance changes detected.');
  } else {
    significant.forEach(result => {
      const emoji = result.improved ? '✅' : '❌';
      const sign = result.diff > 0 ? '+' : '';
      console.log(
        `${emoji} ${result.name}:\n` +
        `   Base:    ${result.base.toFixed(2)} ops/sec\n` +
        `   Current: ${result.current.toFixed(2)} ops/sec\n` +
        `   Change:  ${sign}${result.diff.toFixed(2)}%\n`
      );
    });
  }
  
  console.log('\nAll results:');
  console.log('-'.repeat(80));
  
  comparison.forEach(result => {
    const sign = result.diff > 0 ? '+' : '';
    const symbol = result.improved ? '↑' : '↓';
    console.log(
      `${symbol} ${result.name}: ${sign}${result.diff.toFixed(2)}% ` +
      `(${result.base.toFixed(2)} → ${result.current.toFixed(2)} ops/sec)`
    );
  });
  
  // Performance summary
  const improvements = comparison.filter(c => c.improved && c.significant).length;
  const regressions = comparison.filter(c => !c.improved && c.significant).length;
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total benchmarks: ${comparison.length}`);
  console.log(`Improvements: ${improvements}`);
  console.log(`Regressions: ${regressions}`);
  console.log(`No significant change: ${comparison.length - improvements - regressions}`);
  
  if (regressions > 0) {
    console.log('\n⚠️  Warning: Performance regressions detected!');
    process.exitCode = 1;
  } else if (improvements > 0) {
    console.log('\n🎉 Performance improvements detected!');
  } else {
    console.log('\n✓ No significant performance changes.');
  }
  
} finally {
  // Return to original branch
  execSync(`git checkout ${originalBranch}`, { stdio: 'inherit' });
}