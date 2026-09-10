#!/usr/bin/env node
/**
 * Convert TypeScript compiler output to SARIF format
 * Usage: node typescript-to-sarif.js <tsc-output.log>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: typescript-to-sarif.js <input-file>');
  process.exit(1);
}

let logContent = '';
try {
  logContent = fs.readFileSync(inputFile, 'utf8');
} catch (e) {
  logContent = '';
}

const sarrifResults = [];

// Parse TypeScript compiler output
// Format: path/to/file.ts(line,col): error/warning TS1234: message
const tsErrorRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/gm;
let match;

while ((match = tsErrorRegex.exec(logContent)) !== null) {
  const [, filePath, line, col, severity, code, message] = match;
  sarrifResults.push({
    ruleId: `typescript/TS${code}`,
    level: severity === 'error' ? 'error' : 'warning',
    message: {
      text: message,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
          },
          region: {
            startLine: parseInt(line, 10),
            startColumn: parseInt(col, 10),
            endLine: parseInt(line, 10),
            endColumn: parseInt(col, 10) + 1,
          },
        },
      },
    ],
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
          name: 'typescript',
          version: '5.0.0', // Nominal version
          informationUri: 'https://www.typescriptlang.org',
        },
      },
      results: sarrifResults,
    },
  ],
};

console.log(JSON.stringify(sarif, null, 2));
