/**
 * Runtime configuration, read once from the environment at startup.
 *
 * Every knob has a default that is safe for the container image, so a deployment that sets
 * nothing at all still gets the documented contract (30 s compile timeout, 8 MiB request cap).
 * Values are validated eagerly: a malformed `TYPST_RENDER_PORT` must fail the process at boot,
 * not silently become `NaN` and surface as an unroutable listener later.
 */
export interface ServiceConfig {
  /** TCP port the HTTP listener binds. */
  readonly port: number;
  /** Bind address. `0.0.0.0` so the sidecar is reachable from the console container. */
  readonly host: string;
  /** Path to (or name on `PATH` of) the Typst CLI. */
  readonly typstBin: string;
  /** Hard wall-clock ceiling on one `typst compile`, after which the child is SIGKILLed. */
  readonly compileTimeoutMs: number;
  /** Maximum accepted `POST /render` body size, enforced while reading, not after. */
  readonly maxRequestBytes: number;
  /** Maximum PDF size returned; a larger render is refused rather than streamed. */
  readonly maxOutputBytes: number;
}

export const DEFAULT_CONFIG: ServiceConfig = {
  port: 8080,
  host: '0.0.0.0',
  typstBin: 'typst',
  compileTimeoutMs: 30_000,
  maxRequestBytes: 8 * 1024 * 1024,
  maxOutputBytes: 32 * 1024 * 1024,
};

function readPositiveInt(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  max: number
): number {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) {
    throw new Error(`${key} must be an integer in 1..${max}, got ${JSON.stringify(raw)}`);
  }
  return parsed;
}

export function readServiceConfig(env: NodeJS.ProcessEnv = process.env): ServiceConfig {
  return {
    port: readPositiveInt(env, 'TYPST_RENDER_PORT', DEFAULT_CONFIG.port, 65_535),
    host: env.TYPST_RENDER_HOST || DEFAULT_CONFIG.host,
    typstBin: env.TYPST_BIN || DEFAULT_CONFIG.typstBin,
    compileTimeoutMs: readPositiveInt(
      env,
      'TYPST_RENDER_TIMEOUT_MS',
      DEFAULT_CONFIG.compileTimeoutMs,
      600_000
    ),
    maxRequestBytes: readPositiveInt(
      env,
      'TYPST_RENDER_MAX_REQUEST_BYTES',
      DEFAULT_CONFIG.maxRequestBytes,
      256 * 1024 * 1024
    ),
    maxOutputBytes: readPositiveInt(
      env,
      'TYPST_RENDER_MAX_OUTPUT_BYTES',
      DEFAULT_CONFIG.maxOutputBytes,
      256 * 1024 * 1024
    ),
  };
}
