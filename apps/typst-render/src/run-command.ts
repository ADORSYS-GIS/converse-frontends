/**
 * A single, small `spawn` wrapper used for every Typst invocation (render and health probe).
 *
 * Why not `execFile`: its `timeout` option reports a kill through `error.killed`, which is also
 * set for a signal the OS delivered for unrelated reasons — the two are indistinguishable at the
 * call site, and "did we hit the 30 s ceiling" is exactly the distinction the render route needs
 * to turn into the right status code. The timer is therefore owned here and its outcome is
 * returned as an explicit `timedOut` flag rather than inferred.
 */
import { spawn } from 'node:child_process';

export interface CommandResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** True when the wall-clock ceiling elapsed and the child was killed, not when it merely failed. */
  readonly timedOut: boolean;
}

export interface RunCommandOptions {
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly env?: NodeJS.ProcessEnv;
  /** Cap on captured stdout/stderr; a runaway diagnostic must not become a memory problem. */
  readonly maxOutputChars?: number;
}

const DEFAULT_MAX_OUTPUT_CHARS = 64 * 1024;

export function runCommand(
  bin: string,
  args: readonly string[],
  options: RunCommandOptions
): Promise<CommandResult> {
  const maxChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;

  return new Promise((resolve, reject) => {
    const child = spawn(bin, [...args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const append = (buffer: string, chunk: Buffer): string =>
      buffer.length >= maxChars ? buffer : (buffer + chunk.toString('utf8')).slice(0, maxChars);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });

    // SIGKILL, not SIGTERM: a Typst compile stuck in a tight loop is not guaranteed to service a
    // catchable signal, and the request is already over budget by the time this fires.
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs);
    timer.unref();

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}
