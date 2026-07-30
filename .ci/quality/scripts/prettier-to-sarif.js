#!/usr/bin/env node
/**
 * Convert Prettier `--check` output to SARIF format
 * Usage: node prettier-to-sarif.js <prettier-output.log>
 */

const fs = require('fs');
const path = require('path');

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

// Real `prettier --check` output looks like:
//   Checking formatting...
//   [warn] path/to/file.ts
//   [warn] Code style issues found in the above file(s). Run Prettier with --write to fix.
const lines = logContent.split('\n');
lines.forEach((line) => {
  const trimmed = line.trim().replace(/^\[(warn|error)\]\s*/, '');
  const isSourceFile = /\.(ts|tsx|js|jsx|json|css|md)$/.test(trimmed);
  if (isSourceFile && fs.existsSync(trimmed)) {
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
