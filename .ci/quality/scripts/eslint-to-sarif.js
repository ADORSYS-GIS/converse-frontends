#!/usr/bin/env node
/**
 * Convert ESLint JSON report to SARIF format
 * Usage: node eslint-to-sarif.js <eslint-report.json>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: eslint-to-sarif.js <input-file>');
  process.exit(1);
}

let results = [];
try {
  const rawData = fs.readFileSync(inputFile, 'utf8');
  results = JSON.parse(rawData);
} catch (e) {
  // If file doesn't exist or is invalid JSON, output empty SARIF
  results = [];
}

const runs = [];

// Group results by file
const fileResults = {};
results.forEach((file) => {
  if (file.messages && file.messages.length > 0) {
    fileResults[file.filePath] = file.messages;
  }
});

// Convert to SARIF results
const sarrifResults = [];
Object.entries(fileResults).forEach(([filePath, messages]) => {
  messages.forEach((msg) => {
    sarrifResults.push({
      ruleId: msg.ruleId || 'eslint/unknown',
      level: mapEslintSeverityToSarif(msg.severity),
      message: {
        text: msg.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
            },
            region: {
              startLine: msg.line,
              startColumn: msg.column,
              endLine: msg.endLine || msg.line,
              endColumn: msg.endColumn || msg.column + 1,
            },
          },
        },
      ],
    });
  });
});

const sarif = {
  $schema:
    'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'eslint',
          version: '9.0.0', // Nominal version
          informationUri: 'https://eslint.org',
        },
      },
      results: sarrifResults,
    },
  ],
};

console.log(JSON.stringify(sarif, null, 2));

function mapEslintSeverityToSarif(severity) {
  // ESLint uses 1 = warning, 2 = error
  return severity === 2 ? 'error' : 'warning';
}
