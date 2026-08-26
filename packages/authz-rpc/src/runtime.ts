// Wraps the generated `CratestackRpcRuntime` (packages/authz-rpc/generated/) via composition, not
// subclassing. As of cratestack-cli 0.4.11 (fixing cratestack/cratestack#125), the generated
// runtime has native extension points for everything we need: a `codec` option (our CBOR/JSON
// codec objects already satisfy the generated `CratestackRpcCodec` interface structurally), a
// `headers` callback re-evaluated fresh on every call, and a `fetch` override. This class only
// adds the token-refresh/401-retry behavior the generated runtime has no hook for — everything
// else (RPC dispatch, codec encode/decode, error decoding) is exactly the generated code,
// unmodified. (An earlier version of this file subclassed `CratestackRpcRuntime` and reimplemented
// `call()`/`batch()` wholesale, back when the generated runtime hardcoded JSON with no extension
// point at all — no longer necessary.)
import {
  CratestackRpcRuntime,
  type CratestackRpcClientOptions,
  type CratestackRpcCodec,
} from '../generated/src/runtime';
import type { RpcLink } from '../generated/src/links';
import { type Codec, defaultCodec } from './codec';

export type { RpcLink } from '../generated/src/links';

/**
 * Adapts our `Codec` (`encode(): Uint8Array`) to the generated `CratestackRpcCodec`
 * (`encode(): BodyInit`). A `Uint8Array` is valid `fetch` body content at runtime — `fetch`
 * accepts any `ArrayBufferView` — but this TypeScript/DOM-lib combination doesn't resolve
 * `Uint8Array<ArrayBufferLike>` against the `BodyInit` union cleanly, hence the explicit cast.
 */
function toCratestackCodec(codec: Codec): CratestackRpcCodec {
  return {
    contentType: codec.contentType,
    encode: (value) => codec.encode(value) as BodyInit,
    decode: (bytes) => codec.decode(bytes),
  };
}

export type AuthzRpcRuntimeOptions = {
  basePath?: CratestackRpcClientOptions['basePath'];
  auth: () => Promise<string>;
  refreshAuth?: () => Promise<boolean>;
  getExpiresAt?: () => number | undefined;
  onRefreshFailure?: () => void;
  /** Overrides `defaultCodec()` (CBOR, always -- see `./codec.ts`). `apps/console` always passes
   *  this explicitly (`./web-codec.ts`'s `@cratestack/cbor`-based codec); `apps/self-service`
   *  leaves it unset and gets the `cborg`-based default. Also used directly by tests. */
  codec?: Codec;
  /** Underlying fetch implementation `authenticatedFetch` delegates to. Defaults to global
   *  `fetch`. Mainly for tests — the generated runtime's own `fetch` option is always set to
   *  `authenticatedFetch` by this class, so this is the real injection point instead. */
  fetch?: typeof fetch;
  /** Passed straight through to the generated `CratestackRpcRuntime`'s composable interceptor
   *  chain (cratestack issue #182). Construction-only, like `basePath`/`codec` above — changing
   *  it on a later `configure()` call has no effect, since `configure()` only swaps the mutable
   *  auth closures, not the underlying runtime. Omitted by default everywhere in this app today;
   *  see `@cratestack/api`'s `createBatchLink()` for the automatic-batching link this exists to
   *  support. */
  links?: RpcLink[];
};

const REFRESH_COOLDOWN_MS = 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

export class AuthzRpcRuntime {
  /** The generated runtime, constructed once and handed to `LightbridgeAuthzRpcClient`. */
  readonly runtime: CratestackRpcRuntime;

  /**
   * Mutable on purpose: `configure()` is called on every render by `useAuthzRpcClient` so a
   * fresh `auth`/`refreshAuth` closure is always in effect, without constructing a new runtime
   * (and losing refresh-cooldown state) each time.
   */
  private authOptions: AuthzRpcRuntimeOptions;
  private refreshCooldownUntil = 0;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(origin: string, options: AuthzRpcRuntimeOptions) {
    this.authOptions = options;
    this.runtime = new CratestackRpcRuntime(origin, {
      basePath: options.basePath,
      codec: toCratestackCodec(options.codec ?? defaultCodec()),
      links: options.links,
      headers: async () => {
        const token = await this.authOptions.auth();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        return headers;
      },
      fetch: (input, init) => this.authenticatedFetch(input, init),
    });
  }

  configure(options: AuthzRpcRuntimeOptions): void {
    this.authOptions = options;
  }

  private isRefreshInCooldown(): boolean {
    return Date.now() < this.refreshCooldownUntil;
  }

  private markRefreshFailed(): void {
    this.refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
  }

  private resetRefreshCooldown(): void {
    this.refreshCooldownUntil = 0;
  }

  private async performRefresh(): Promise<boolean> {
    const { refreshAuth, onRefreshFailure } = this.authOptions;
    if (!refreshAuth) {
      return false;
    }
    if (this.refreshPromise === null) {
      this.refreshPromise = refreshAuth();
      try {
        const success = await this.refreshPromise;
        if (success) {
          this.resetRefreshCooldown();
        } else {
          this.markRefreshFailed();
          onRefreshFailure?.();
        }
        return success;
      } catch {
        this.markRefreshFailed();
        onRefreshFailure?.();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    }
    const success = await this.refreshPromise;
    if (!success && !this.isRefreshInCooldown()) {
      this.markRefreshFailed();
    }
    return success;
  }

  private async tryProactiveRefresh(): Promise<void> {
    const { refreshAuth, getExpiresAt } = this.authOptions;
    if (!refreshAuth || !getExpiresAt || this.isRefreshInCooldown()) {
      return;
    }
    const expiresAt = getExpiresAt();
    if (!expiresAt) {
      return;
    }
    if (expiresAt - Date.now() <= TOKEN_REFRESH_BUFFER_MS) {
      await this.performRefresh();
    }
  }

  /**
   * Proactive refresh + reactive 401-retry-once, then delegates to the real `fetch`. The
   * generated runtime's `headers` callback already ran once (via `resolveHeaders`) to build the
   * now-stale request before `fetchFn` is ever invoked, so a plain retry would resend the same
   * expired token — this overrides the `Authorization` header directly on the retried request
   * instead of trying to re-invoke that callback.
   */
  private async authenticatedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const baseFetch = this.authOptions.fetch ?? fetch;
    await this.tryProactiveRefresh();
    const response = await baseFetch(input, init);
    if (response.status === 401 && !this.isRefreshInCooldown() && this.authOptions.refreshAuth) {
      const refreshed = await this.performRefresh();
      if (refreshed) {
        const token = await this.authOptions.auth();
        const headers = new Headers(init?.headers);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return baseFetch(input, { ...init, headers });
      }
    }
    return response;
  }
}
