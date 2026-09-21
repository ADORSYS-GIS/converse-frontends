import { afterEach, describe, expect, it } from 'vitest';

import { agentNamespace } from './agent-namespace';

const ORIGINAL = process.env.AGENT_NAMESPACE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.AGENT_NAMESPACE;
  else process.env.AGENT_NAMESPACE = ORIGINAL;
});

describe('agentNamespace', () => {
  it('falls back to the shared default when unset', () => {
    delete process.env.AGENT_NAMESPACE;
    expect(agentNamespace()).toBe('lightbridge-agents');
  });

  it('uses a real value from the environment', () => {
    process.env.AGENT_NAMESPACE = 'converse';
    expect(agentNamespace()).toBe('converse');
  });

  it('falls back to the default for a value that is not a valid k8s name', () => {
    process.env.AGENT_NAMESPACE = 'not a namespace!';
    expect(agentNamespace()).toBe('lightbridge-agents');
  });
});
