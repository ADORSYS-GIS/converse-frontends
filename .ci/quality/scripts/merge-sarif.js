#!/usr/bin/env node
/**
 * Merge multiple SARIF files into a single report
 * Usage: node merge-sarif.js <file1.sarif> [file2.sarif] ...
 */

const fs = require('fs');

const inputFiles = process.argv.slice(2);

if (inputFiles.length === 0) {
  console.error('Usage: merge-sarif.js <file1.sarif> [file2.sarif] ...');
  process.exit(1);
}

const mergedRuns = [];

inputFiles.forEach((file) => {
  try {
    if (fs.existsSync(file)) {
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (content.runs && Array.isArray(content.runs)) {
        mergedRuns.push(...content.runs);
      }
    }
  } catch (e) {
    // Skip malformed files
    console.warn(`Warning: Could not parse ${file}:`, e.message);
  }
});

const merged = {
  $schema:
    'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: mergedRuns,
};

console.log(JSON.stringify(merged, null, 2));
