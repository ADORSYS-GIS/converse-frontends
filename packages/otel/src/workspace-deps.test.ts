import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The `@opentelemetry/*` version list exists in THREE package.json files, and this test is what
 * stops the copies from drifting apart.
 *
 * ## Why the duplication is unavoidable
 *
 * `packages/otel` declares the packages because it imports them. Each consuming app must ALSO
 * declare them, for two reasons that only bite outside a developer's machine:
 *
 *  - Under pnpm's strict layout an app only gets `apps/<app>/node_modules/<pkg>` symlinks for its
 *    OWN declared dependencies. `@lightbridge/otel` is in `transpilePackages`, so its code is
 *    compiled INTO the app's server bundle and the resulting `require('@opentelemetry/sdk-node')`
 *    is resolved from `apps/<app>/`, not from `packages/otel/`. Undeclared, it is MODULE_NOT_FOUND
 *    the moment `next start` boots.
 *  - `next.config.mjs` lists them in `serverExternalPackages`, whose contract is that the package
 *    is a real, resolvable dependency of the app rather than something the bundler inlines.
 *
 * ## Why it is a test rather than a comment
 *
 * A version list duplicated across files and maintained by memory goes stale silently: the app
 * installs one minor of `@opentelemetry/api` and the package another, two copies of the module
 * that holds the global tracer provider end up in one process, and the spans registered through
 * one are invisible to the other. That is a silent no-telemetry failure with no error message —
 * exactly the kind that reaches production. Here it is a failing test on the branch that
 * introduces it.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

/** Every workspace that must carry the same `@opentelemetry/*` ranges as this package. */
const CONSUMERS = ['apps/console', 'apps/lci'];

interface Manifest {
  readonly name: string;
  readonly dependencies?: Record<string, string>;
}

function readManifest(relativeDir: string): Manifest {
  return JSON.parse(readFileSync(join(REPO_ROOT, relativeDir, 'package.json'), 'utf8')) as Manifest;
}

function otelDeps(manifest: Manifest): Record<string, string> {
  return Object.fromEntries(
    Object.entries(manifest.dependencies ?? {}).filter(([name]) =>
      name.startsWith('@opentelemetry/')
    )
  );
}

describe('@opentelemetry/* ranges across the workspace', () => {
  const own = otelDeps(readManifest('packages/otel'));

  it('this package actually declares the SDK it wires up', () => {
    // A guard on the guard: if `packages/otel` ever stopped declaring these, every consumer
    // assertion below would trivially pass against an empty set.
    expect(Object.keys(own).length).toBeGreaterThan(0);
    expect(own).toHaveProperty('@opentelemetry/api');
    expect(own).toHaveProperty('@opentelemetry/sdk-node');
  });

  it.each(CONSUMERS)('%s declares exactly the same packages at the same ranges', (consumer) => {
    expect(otelDeps(readManifest(consumer))).toEqual(own);
  });
});
