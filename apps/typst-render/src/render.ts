/**
 * The render pipeline: a validated request in, a PDF (or a typed failure) out.
 *
 * One request == one throwaway directory under the OS temp root. Nothing is shared between
 * requests — not a working directory, not a font cache, not a package cache — so two concurrent
 * renders cannot see or clobber each other's `main.typ`, and a crash mid-compile leaves at most
 * one orphaned directory rather than a corrupt shared workspace. The directory is removed in a
 * `finally`, including on the timeout and error paths.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ServiceConfig } from './config.js';
import {
  DATA_FILENAME,
  OUTPUT_FILENAME,
  TEMPLATE_FILENAME,
  type RenderRequest,
} from './render-request.js';
import { runCommand } from './run-command.js';

export type RenderOutcome =
  | { readonly kind: 'pdf'; readonly pdf: Buffer }
  /** Typst exited non-zero: the template or its data is wrong. Caller surfaces stderr verbatim. */
  | { readonly kind: 'compile-error'; readonly message: string }
  /** The compile exceeded the wall-clock ceiling and was killed. */
  | { readonly kind: 'timeout'; readonly message: string }
  /** The produced PDF is larger than the configured ceiling. */
  | { readonly kind: 'output-too-large'; readonly message: string };

/**
 * Directory Typst is pointed at for BOTH local packages and the package cache.
 *
 * The service is designed to run with no egress (see README, "Offline"). Pointing both package
 * paths at an empty per-request directory means a template that tries `#import "@preview/…"`
 * fails with a Typst error naming the missing package — a 422 the caller can act on — instead of
 * hanging until the 30 s timeout while a blocked DNS/TCP connect drains.
 */
const PACKAGE_DIR = 'packages';

export interface TypstEnvironmentOverrides {
  /** Injectable for tests; defaults to `os.tmpdir()`. */
  readonly tmpRoot?: string;
}

async function writeAssets(root: string, assets: RenderRequest['assets']): Promise<void> {
  for (const [name, bytes] of assets) {
    const target = path.join(root, name);
    // Belt-and-braces against a traversal that slipped past `isSafeAssetName`: the resolved path
    // must still be inside the render root. Cheap, and the consequence of being wrong is writing
    // an attacker-chosen file as the service user.
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`asset ${JSON.stringify(name)} escapes the render root`);
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }
}

export async function renderPdf(
  request: RenderRequest,
  config: ServiceConfig,
  overrides: TypstEnvironmentOverrides = {}
): Promise<RenderOutcome> {
  const tmpRoot = overrides.tmpRoot ?? os.tmpdir();
  const root = await fs.mkdtemp(path.join(tmpRoot, 'typst-render-'));

  try {
    await fs.writeFile(path.join(root, TEMPLATE_FILENAME), request.template, 'utf8');
    await fs.writeFile(path.join(root, DATA_FILENAME), JSON.stringify(request.data), 'utf8');
    await fs.mkdir(path.join(root, PACKAGE_DIR), { recursive: true });
    await writeAssets(root, request.assets);

    const result = await runCommand(
      config.typstBin,
      [
        'compile',
        // `--root` confines Typst's own file reads to this directory: a template cannot
        // `read("/etc/passwd")` its way out even though it is arbitrary source we were handed.
        '--root',
        '.',
        // `sys.inputs.data` is the *filename*; the template calls `json(sys.inputs.at("data"))`.
        // Passing the path rather than the payload keeps a multi-MB dataset off the argv, which
        // has a hard OS limit.
        '--input',
        `data=${DATA_FILENAME}`,
        // Reproducibility: the container has no system fonts at all, so a render that quietly
        // depended on a developer machine's fonts would look different in production. Embedded
        // fonts (Libertinus, New Computer Modern, DejaVu Sans Mono) stay available, and a caller
        // that needs its own typeface ships it as an asset — `--font-path .` picks it up.
        '--ignore-system-fonts',
        '--font-path',
        '.',
        '--package-path',
        PACKAGE_DIR,
        '--package-cache-path',
        PACKAGE_DIR,
        TEMPLATE_FILENAME,
        OUTPUT_FILENAME,
      ],
      { cwd: root, timeoutMs: config.compileTimeoutMs }
    );

    if (result.timedOut) {
      return {
        kind: 'timeout',
        message: `typst compile exceeded ${config.compileTimeoutMs}ms and was terminated`,
      };
    }

    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout).trim();
      return {
        kind: 'compile-error',
        message: detail.length > 0 ? detail : `typst compile exited with code ${result.code}`,
      };
    }

    const outputPath = path.join(root, OUTPUT_FILENAME);
    const stat = await fs.stat(outputPath);
    if (stat.size > config.maxOutputBytes) {
      return {
        kind: 'output-too-large',
        message: `rendered PDF is ${stat.size} bytes, over the ${config.maxOutputBytes} byte limit`,
      };
    }

    return { kind: 'pdf', pdf: await fs.readFile(outputPath) };
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

export interface HealthResult {
  readonly healthy: boolean;
  /** `typst --version` output, or the reason it could not be obtained. */
  readonly detail: string;
}

/**
 * Health probe. Deliberately executes the real binary rather than stat-ing it: a `typst` that is
 * present but unrunnable (wrong architecture, missing loader, corrupt layer) is exactly the
 * failure this sidecar is most likely to have, and only running it tells the two apart.
 */
export async function checkTypst(config: ServiceConfig): Promise<HealthResult> {
  try {
    const result = await runCommand(config.typstBin, ['--version'], {
      cwd: os.tmpdir(),
      timeoutMs: Math.min(config.compileTimeoutMs, 5_000),
    });
    if (result.timedOut) return { healthy: false, detail: 'typst --version timed out' };
    if (result.code !== 0) {
      return { healthy: false, detail: `typst --version exited with code ${result.code}` };
    }
    return { healthy: true, detail: result.stdout.trim() || result.stderr.trim() };
  } catch (error) {
    return { healthy: false, detail: error instanceof Error ? error.message : String(error) };
  }
}
