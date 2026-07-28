#!/usr/bin/env node
/**
 * Convert actionlint JSON report to SARIF format
 * Usage: node actionlint-to-sarif.js <actionlint-report.json>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: actionlint-to-sarif.js <input-file>');
  process.exit(1);
}

let results = [];
try {
  const rawData = fs.readFileSync(inputFile, 'utf8');
  results = JSON.parse(rawData);
} catch (e) {
  results = [];
}

// actionlint returns an array of issue objects
const sarrifResults = results.map((issue) => ({
  ruleId: issue.rule || 'actionlint/unknown',
  level: 'warning', // actionlint doesn't distinguish severity; treat as warning
  message: {
    text: issue.message,
  },
  locations: [
    {
      physicalLocation: {
        artifactLocation: {
          uri: path.relative(process.cwd(), issue.filepath || '.github/workflows/unknown.yml').replace(/\\/g, '/'),
        },
        region: {
          startLine: issue.line || 1,
          startColumn: issue.column || 1,
          endLine: issue.line || 1,
          endColumn: (issue.column || 1) + 1,
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
          name: 'actionlint',
          version: '1.0.0', // Nominal version
          informationUri: 'https://github.com/rhysd/actionlint',
        },
      },
      results: sarrifResults,
    },
  ],
};

console.log(JSON.stringify(sarif, null, 2));
