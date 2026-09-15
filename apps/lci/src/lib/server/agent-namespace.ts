// A safe Kubernetes resource name (DNS-label-ish). Validated before landing in a copyable shell
// command, so a malformed namespace can't smuggle shell metacharacters into it.
const K8S_NAME_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/i;

/** The Kubernetes namespace agent run Jobs live in, for the `kubectl logs` snippet — read from
 *  this server's own `AGENT_NAMESPACE`, which should mirror the control plane's own resolution of
 *  the same setting. Falls back to the shared default when unset or not a valid k8s name. */
export function agentNamespace(): string {
  const ns = process.env.AGENT_NAMESPACE?.trim() || 'lightbridge-agents';
  return K8S_NAME_RE.test(ns) ? ns : 'lightbridge-agents';
}
