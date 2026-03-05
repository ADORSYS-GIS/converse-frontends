import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@hey-api/openapi-ts';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

export default defineConfig({
  input: [
    path.resolve(currentDir, '../../openapi/api-key.backend.yaml'),
    path.resolve(currentDir, '../../openapi/usage.backend.yaml'),
  ],
  output: {
    path: path.resolve(currentDir, './src/client'),
  },
  plugins: [
    '@hey-api/typescript',
    '@hey-api/client-axios',
    'zod',
    {
      name: '@hey-api/sdk',
      validator: true,
    },
  ],
});
