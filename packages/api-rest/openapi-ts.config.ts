import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../../openapi/backend.yaml',
  output: {
    path: './src/client',
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
