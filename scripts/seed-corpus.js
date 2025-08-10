#!/usr/bin/env node

/**
 * Copy seed files from testdata/ to .cifuzz-corpus/ for fuzzing
 * This provides initial corpus data to make fuzzing more effective
 * 
 * Automatically discovers corpus directories and matches them with testdata
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Recursively find all files in a directory
 */
async function findFiles(dir, files = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await findFiles(fullPath, files);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return files;
}

/**
 * Recursively find all leaf directories (directories with no subdirectories)
 */
async function findLeafDirectories(dir, leaves = []) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const subdirs = entries.filter(e => e.isDirectory());
    
    if (subdirs.length === 0) {
      // This is a leaf directory
      leaves.push(dir);
    } else {
      // Recurse into subdirectories
      for (const subdir of subdirs) {
        await findLeafDirectories(join(dir, subdir.name), leaves);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return leaves;
}

/**
 * Copy a file to corpus directory with appropriate naming
 */
async function copyToCorpus(sourceFile, corpusDir) {
  try {
    // Create corpus directory if it doesn't exist
    await mkdir(corpusDir, { recursive: true });
    
    // Read the file
    const content = await readFile(sourceFile);
    
    // Generate a unique name based on the original filename
    const name = basename(sourceFile);
    const destFile = join(corpusDir, `seed_${name}`);
    
    // Write to corpus
    await writeFile(destFile, content);
    
    return true;
  } catch (error) {
    console.error(`Failed to copy ${sourceFile}: ${error.message}`);
    return false;
  }
}

/**
 * Extract format from fuzzer name (e.g., "ipuz.fuzz" -> "ipuz")
 */
function extractFormat(fuzzerName) {
  const match = fuzzerName.match(/^(\w+)\.fuzz$/);
  return match ? match[1] : null;
}

/**
 * Main function
 */
async function main() {
  const testdataDir = join(projectRoot, 'testdata');
  const corpusDir = join(projectRoot, '.cifuzz-corpus');
  
  // Check if testdata directory exists
  if (!existsSync(testdataDir)) {
    console.log('testdata/ directory not found, skipping corpus seeding');
    return;
  }
  
  console.log('Seeding fuzzer corpus from testdata...\n');
  
  // First, discover all fuzzer corpus directories
  console.log('Discovering corpus directories...');
  
  let fuzzerCorpusDirs = [];
  
  if (existsSync(corpusDir)) {
    // Find all *.fuzz directories
    try {
      const entries = await readdir(corpusDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.endsWith('.fuzz')) {
          const fuzzerDir = join(corpusDir, entry.name);
          const leafDirs = await findLeafDirectories(fuzzerDir);
          
          const format = extractFormat(entry.name);
          
          for (const leafDir of leafDirs) {
            fuzzerCorpusDirs.push({
              fuzzer: entry.name,
              format: format,
              path: leafDir
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading corpus directory: ${error.message}`);
    }
  }
  
  // Note: We only copy to .cifuzz-corpus directories, not local fuzz/ directories
  // The local fuzz/ directories are for test organization, not corpus storage
  
  if (fuzzerCorpusDirs.length === 0) {
    console.log('No corpus directories found. Run a fuzzer first to create them.');
    console.log('Example: npm run fuzz:quick');
    return;
  }
  
  console.log(`Found ${fuzzerCorpusDirs.length} corpus directories\n`);
  
  // Get all available testdata formats (excluding .git)
  const testdataFormats = [];
  try {
    const entries = await readdir(testdataDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== '.git') {
        testdataFormats.push(entry.name);
      }
    }
  } catch (error) {
    console.error(`Error reading testdata directory: ${error.message}`);
    return;
  }
  
  console.log(`Available testdata formats: ${testdataFormats.join(', ')}\n`);
  
  let totalCopied = 0;
  let totalFailed = 0;
  
  // Process each corpus directory
  for (const corpusInfo of fuzzerCorpusDirs) {
    console.log(`Processing ${corpusInfo.fuzzer} -> ${corpusInfo.path.replace(projectRoot, '.')}`);
    
    let filesToCopy = [];
    
    if (corpusInfo.format && testdataFormats.includes(corpusInfo.format)) {
      // Format-specific fuzzer: copy only matching format
      console.log(`  Matching format: ${corpusInfo.format}`);
      const formatDir = join(testdataDir, corpusInfo.format);
      filesToCopy = await findFiles(formatDir);
    } else {
      // Generic fuzzer (like parse.fuzz): copy all testdata
      console.log(`  Generic fuzzer: copying all testdata`);
      for (const format of testdataFormats) {
        const formatDir = join(testdataDir, format);
        const files = await findFiles(formatDir);
        filesToCopy.push(...files);
      }
    }
    
    if (filesToCopy.length === 0) {
      console.log(`  No files to copy`);
      continue;
    }
    
    console.log(`  Copying ${filesToCopy.length} files...`);
    
    let copied = 0;
    let failed = 0;
    
    for (const file of filesToCopy) {
      const success = await copyToCorpus(file, corpusInfo.path);
      if (success) {
        copied++;
      } else {
        failed++;
      }
    }
    
    console.log(`  Copied ${copied} files`);
    if (failed > 0) {
      console.log(`  Failed ${failed} files`);
    }
    
    totalCopied += copied;
    totalFailed += failed;
    console.log('');
  }
  
  // Summary
  console.log('Summary:');
  console.log(`  Total files copied: ${totalCopied}`);
  if (totalFailed > 0) {
    console.log(`  Total files failed: ${totalFailed}`);
  }
  
  console.log('\nCorpus seeding complete!');
  console.log('Run fuzzing with: npm run fuzz');
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});