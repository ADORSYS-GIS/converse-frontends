#!/usr/bin/env node
/**
 * Convert jscpd JSON report to SARIF format
 * Usage: node jscpd-to-sarif.js <jscpd-report.json>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: jscpd-to-sarif.js <input-file>');
  process.exit(1);
}

let report = {};
try {
  const rawData = fs.readFileSync(inputFile, 'utf8');
  report = JSON.parse(rawData);
} catch (e) {
  report = { duplicates: [] };
}

// jscpd report structure: { duplicates: Array<{lines: number, firstFile: ..., secondFile: ..., ...}> }
const sarrifResults = [];

if (report.duplicates && Array.isArray(report.duplicates)) {
  report.duplicates.forEach((dup, idx) => {
    // Each duplicate is reported as a pair of locations
    if (dup.firstFile && dup.secondFile) {
      sarrifResults.push({
        ruleId: 'jscpd/duplicate-code',
        level: 'note', // Duplication is informational, not an error
        message: {
          text: `Duplicate code found: ${dup.lines} lines duplicated between files.`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: path
                  .relative(process.cwd(), dup.firstFile)
                  .replace(/\\/g, '/'),
              },
              region: {
                startLine: dup.firstFileStart || 1,
                startColumn: 1,
                endLine:
                  (dup.firstFileStart || 1) +
                  (dup.lines || 1) -
                  1,
              },
            },
          },
          {
            physicalLocation: {
              artifactLocation: {
                uri: path
                  .relative(process.cwd(), dup.secondFile)
                  .replace(/\\/g, '/'),
              },
              region: {
                startLine: dup.secondFileStart || 1,
                startColumn: 1,
                endLine:
                  (dup.secondFileStart || 1) +
                  (dup.lines || 1) -
                  1,
              },
            },
          },
        ],
      });
    }
  });
}

const sarif = {
  $schema:
    'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'jscpd',
          version: '4.0.0', // Nominal version
          informationUri: 'https://github.com/kucherenko/jscpd',
        },
      },
      results: sarrifResults,
    },
  ],
};

console.log(JSON.stringify(sarif, null, 2));
