/**
 * Process entrypoint. Reads config, starts the listener, and shuts down cleanly on SIGTERM —
 * which is what Kubernetes sends first, and what decides whether an in-flight render finishes or
 * the caller sees a truncated response during a rolling update.
 */
import { readServiceConfig } from './config.js';
import { createRenderServer } from './server.js';

const config = readServiceConfig();
const server = createRenderServer(config);

server.listen(config.port, config.host, () => {
  console.log(
    `[typst-render] listening on http://${config.host}:${config.port} ` +
      `(typst=${config.typstBin}, timeout=${config.compileTimeoutMs}ms, ` +
      `maxRequest=${config.maxRequestBytes}B)`
  );
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    console.log(`[typst-render] ${signal} received, closing listener`);
    server.close(() => process.exit(0));
  });
}
