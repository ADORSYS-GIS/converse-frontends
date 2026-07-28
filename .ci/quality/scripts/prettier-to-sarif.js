#!/usr/bin/env node
/**
 * Convert Prettier format check output to SARIF format
 * Usage: node prettier-to-sarif.js <prettier-output.log>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: prettier-to-sarif.js <input-file>');
  process.exit(1);
}

let logContent = '';
try {
  logContent = fs.readFileSync(inputFile, 'utf8');
} catch (e) {
  logContent = '';
}

const sarrifResults = [];

// Prettier output contains file paths that don't match the format check
// Extract files from stderr/stdout lines like: "path/to/file.ts"
const lines = logContent.split('\n');
lines.forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('[') && trimmed.endsWith('.ts') || trimmed.endsWith('.tsx') || trimmed.endsWith('.js') || trimmed.endsWith('.jsx') || trimmed.endsWith('.json') || trimmed.endsWith('.css') || trimmed.endsWith('.md')) {
    // This is a file path
    if (fs.existsSync(trimmed)) {
      sarrifResults.push({
        ruleId: 'prettier/format',
        level: 'note',
        message: {
          text: 'File does not match Prettier formatting.',
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: path.relative(process.cwd(), trimmed).replace(/\\/g, '/'),
              },
              region: {
                startLine: 1,
                startColumn: 1,
              },
            },
          },
        ],
      });
    }
  }
});

const sarif = {
  $schema:
    'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'prettier',
          version: '3.0.0', // Nominal version
          informationUri: 'https://prettier.io',
        },
      },
      results: sarrifResults,
    },
  ],
};

console.log(JSON.stringify(sarif, null, 2));
