// Hand-authored extension of the generated `CratestackRpcRuntime` (packages/authz-rpc/generated/,
// produced by `cratestack generate-typescript` — see package.json's `codegen` script). The
// generated runtime is JSON-only and has no auth-refresh hook; this subclass adds exactly those
// two things (CBOR-in-prod/JSON-in-dev codec selection, and the token-refresh/401-retry behavior
// the previous REST client had) without reimplementing RPC dispatch itself.
import {
  CratestackRpcError,
  CratestackRpcRuntime,
  type CratestackRpcCallOptions,
  type CratestackRpcClientOptions,
  type RpcErrorBody,
  type RpcRequest,
  type RpcResponseFrame,
} from '../generated/src/runtime';
import { type Codec, defaultCodec } from './codec';

export type AuthzRpcRuntimeOptions = CratestackRpcClientOptions & {
  auth: () => Promise<string>;
  refreshAuth?: () => Promise<boolean>;
  getExpiresAt?: () => number | undefined;
  onRefreshFailure?: () => void;
  /** Overrides the env-driven default (CBOR in prod, JSON elsewhere). Mainly for tests. */
  codec?: Codec;
};

const REFRESH_COOLDOWN_MS = 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

export class AuthzRpcRuntime extends CratestackRpcRuntime {
  /**
   * Mutable on purpose: `configure()` is called on every render by `useAuthzRpcClient` so a
   * fresh `auth`/`refreshAuth` closure is always in effect, without constructing a new runtime
   * (and losing refresh-cooldown state) each time.
   */
  private authOptions: AuthzRpcRuntimeOptions;
  private refreshCooldownUntil = 0;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(origin: string, options: AuthzRpcRuntimeOptions) {
    super(origin, options);
    this.authOptions = options;
  }

  configure(options: AuthzRpcRuntimeOptions): void {
    this.authOptions = options;
  }

  private get codec(): Codec {
    return this.authOptions.codec ?? defaultCodec();
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

  /** Re-derives the base class's private `url()` — same normalization, kept in sync manually. */
  private absoluteUrl(path: string): string {
    const normalizedBase = this.basePath === '/' ? '' : this.basePath.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return new URL(`${normalizedBase}${normalizedPath}`, `${this.origin}/`).toString();
  }

  private async headersFor(extra?: HeadersInit): Promise<Headers> {
    const headers = new Headers(extra);
    const token = await this.authOptions.auth();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Accept', this.codec.contentType);
    headers.set('Content-Type', this.codec.contentType);
    return headers;
  }

  private async decodeError(response: Response): Promise<RpcErrorBody> {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) {
      return { code: 'internal', message: `RPC call returned status ${response.status}` };
    }
    try {
      const parsed = this.codec.decode(bytes) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && typeof parsed.code === 'string') {
        return parsed as unknown as RpcErrorBody;
      }
      if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
        // The app's own RBAC gate (runs before the RPC dispatcher) uses `{ error: string }`,
        // distinct from cratestack's own `RpcErrorBody` — normalize both to the same shape.
        return { code: 'internal', message: parsed.error as string };
      }
      return { code: 'internal', message: JSON.stringify(parsed) };
    } catch {
      return { code: 'internal', message: `RPC call returned status ${response.status}` };
    }
  }

  private async decodeUnary(response: Response): Promise<unknown> {
    if (!response.ok) {
      throw new CratestackRpcError(response.status, await this.decodeError(response));
    }
    if (response.status === 204) {
      return undefined;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) {
      return undefined;
    }
    return this.codec.decode(bytes);
  }

  override async call<I, O>(
    opId: string,
    input: I,
    options: CratestackRpcCallOptions = {}
  ): Promise<O> {
    await this.tryProactiveRefresh();
    const codec = this.codec;

    const send = async (): Promise<Response> => {
      const headers = await this.headersFor(options.headers);
      if (options.idempotencyKey !== undefined) {
        headers.set('Idempotency-Key', options.idempotencyKey);
      }
      return this.fetchFn(this.absoluteUrl(`/rpc/${encodeURIComponent(opId)}`), {
        method: 'POST',
        headers,
        body: codec.encode(input ?? null) as BodyInit,
        signal: options.signal,
      });
    };

    let response = await send();
    if (response.status === 401 && !this.isRefreshInCooldown() && this.authOptions.refreshAuth) {
      const refreshed = await this.performRefresh();
      if (refreshed) {
        response = await send();
      }
    }

    return (await this.decodeUnary(response)) as O;
  }

  override async batch<O = unknown>(
    requests: RpcRequest[],
    options: CratestackRpcCallOptions = {}
  ): Promise<RpcResponseFrame<O>[]> {
    await this.tryProactiveRefresh();
    const codec = this.codec;
    const headers = await this.headersFor(options.headers);
    const response = await this.fetchFn(this.absoluteUrl('/rpc/batch'), {
      method: 'POST',
      headers,
      body: codec.encode(requests) as BodyInit,
      signal: options.signal,
    });
    return (await this.decodeUnary(response)) as RpcResponseFrame<O>[];
  }
}
