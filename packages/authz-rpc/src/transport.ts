import { type Codec, defaultCodec } from './codec';

export type AuthzRpcClientConfig = {
  baseURL: string;
  auth: () => Promise<string>;
  refreshAuth?: () => Promise<boolean>;
  getExpiresAt?: () => number | undefined;
  onRefreshFailure?: () => void;
  /** Overrides the env-driven default (CBOR in prod, JSON elsewhere). Mainly for tests. */
  codec?: Codec;
};

/**
 * Error shape the RPC surface can return. Two distinct producers exist in the backend:
 * the app's RBAC gate (`{ "error": "message" }`, 401/403, runs before the dispatcher) and
 * cratestack's own `RpcErrorBody` (`{ code, message, details? }`, everything else). Both are
 * handled here rather than assuming one shape.
 */
export class RpcError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly code?: string;

  constructor(status: number, message: string, body: unknown, code?: string) {
    super(message);
    this.name = 'RpcError';
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

let latestConfig: AuthzRpcClientConfig | null = null;

/** Sets the module-level client config. Re-invoked on every render by `useAuthzRpcClient`. */
export function configureAuthzRpcClient(config: AuthzRpcClientConfig): void {
  latestConfig = config;
}

function requireConfig(): AuthzRpcClientConfig {
  if (!latestConfig) {
    throw new Error(
      'AuthzRpcClient is not configured. Call useAuthzRpcClient()/configureAuthzRpcClient() first.'
    );
  }
  return latestConfig;
}

/** Timestamp until which refresh attempts are skipped after a definitive failure. */
let refreshCooldownUntil = 0;
const REFRESH_COOLDOWN_MS = 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
let refreshPromise: Promise<boolean> | null = null;

function isRefreshInCooldown(): boolean {
  return Date.now() < refreshCooldownUntil;
}

function markRefreshFailed(): void {
  refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
}

function resetRefreshCooldown(): void {
  refreshCooldownUntil = 0;
}

/** Runs `refreshAuth`, deduping concurrent callers onto a single in-flight promise. */
async function performRefresh(config: AuthzRpcClientConfig): Promise<boolean> {
  if (!config.refreshAuth) {
    return false;
  }
  if (refreshPromise === null) {
    refreshPromise = config.refreshAuth();
    try {
      const success = await refreshPromise;
      if (success) {
        resetRefreshCooldown();
      } else {
        markRefreshFailed();
        config.onRefreshFailure?.();
      }
      return success;
    } catch {
      markRefreshFailed();
      config.onRefreshFailure?.();
      return false;
    } finally {
      refreshPromise = null;
    }
  }
  const success = await refreshPromise;
  if (!success && !isRefreshInCooldown()) {
    markRefreshFailed();
  }
  return success;
}

async function tryProactiveRefresh(config: AuthzRpcClientConfig): Promise<void> {
  if (!config.refreshAuth || !config.getExpiresAt || isRefreshInCooldown()) {
    return;
  }
  const expiresAt = config.getExpiresAt();
  if (!expiresAt) {
    return;
  }
  if (expiresAt - Date.now() <= TOKEN_REFRESH_BUFFER_MS) {
    await performRefresh(config);
  }
}

function safeDecode(codec: Codec, bytes: Uint8Array): unknown {
  try {
    return codec.decode(bytes);
  } catch {
    return undefined;
  }
}

function extractErrorMessage(body: unknown, opId: string, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return record.message;
    }
    if (typeof record.error === 'string') {
      return record.error;
    }
  }
  return `RPC ${opId} failed with status ${status}`;
}

function extractErrorCode(body: unknown): string | undefined {
  if (
    body &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).code === 'string'
  ) {
    return (body as Record<string, unknown>).code as string;
  }
  return undefined;
}

/**
 * `POST /rpc/{opId}` with `input` encoded via the active codec (CBOR in prod, JSON in
 * dev/CI — see `defaultCodec`). Applies the same proactive-refresh / 401-retry-once /
 * refresh-cooldown behavior the previous REST client used, ported 1:1.
 */
export async function rpcCall<TResult>(opId: string, input: unknown): Promise<TResult> {
  const config = requireConfig();
  const codec = config.codec ?? defaultCodec();

  await tryProactiveRefresh(config);

  const send = async (): Promise<Response> => {
    const token = await config.auth();
    const headers: Record<string, string> = {
      'content-type': codec.contentType,
      accept: codec.contentType,
    };
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    return fetch(`${config.baseURL}/rpc/${opId}`, {
      method: 'POST',
      headers,
      body: codec.encode(input) as BodyInit,
    });
  };

  let response = await send();

  if (response.status === 401 && !isRefreshInCooldown() && config.refreshAuth) {
    const refreshed = await performRefresh(config);
    if (refreshed) {
      response = await send();
    }
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!response.ok) {
    const body = bytes.length > 0 ? safeDecode(codec, bytes) : undefined;
    throw new RpcError(
      response.status,
      extractErrorMessage(body, opId, response.status),
      body,
      extractErrorCode(body)
    );
  }

  if (bytes.length === 0) {
    return undefined as TResult;
  }
  return codec.decode(bytes) as TResult;
}
