#!/usr/bin/env node
/**
 * Convert Hadolint JSON report to SARIF format
 * Usage: node hadolint-to-sarif.js <hadolint-report.json>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: hadolint-to-sarif.js <input-file>');
  process.exit(1);
}

let results = [];
try {
  const rawData = fs.readFileSync(inputFile, 'utf8');
  results = JSON.parse(rawData);
} catch (e) {
  results = [];
}

// Hadolint returns an array of issue objects
const sarrifResults = results.map((issue) => ({
  ruleId: issue.code || 'hadolint/unknown',
  level: mapHadolintLevelToSarif(issue.level),
  message: {
    text: issue.message,
  },
  locations: [
    {
      physicalLocation: {
        artifactLocation: {
          uri: path.relative(process.cwd(), issue.file || 'Dockerfile').replace(/\\/g, '/'),
        },
        region: {
          startLine: issue.line || 1,
          startColumn: 1,
        },
      },
    },
  ],
}));

const sarif = {
  $schema:
    'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'hadolint',
          version: '2.0.0', // Nominal version
          informationUri: 'https://github.com/hadolint/hadolint',
        },
      },
      results: sarrifResults,
    },
  ],
};

console.log(JSON.stringify(sarif, null, 2));

function mapHadolintLevelToSarif(level) {
  // Hadolint uses "warning" and "error"
  return level === 'error' ? 'error' : 'warning';
}
