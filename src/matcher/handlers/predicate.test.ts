import { describe, it, expect, beforeEach } from 'vitest';
import { createPredicateHandler } from './predicate';
import { PredicateRegistry } from '../../core/predicate-registry';
import type { GuardrailMatcher, ToolCallContext } from '../../core/types';

describe('predicate matcher', () => {
  let predicateRegistry: PredicateRegistry;
  let predicateHandler: ReturnType<typeof createPredicateHandler>;

  beforeEach(() => {
    predicateRegistry = new PredicateRegistry();
    predicateHandler = createPredicateHandler(predicateRegistry);
  });

  it('resolves predicateName and calls function', () => {
    predicateRegistry.register('is-bash', (ctx) => ctx.toolName === 'bash');
    const matcher: GuardrailMatcher = { type: 'predicate', predicateName: 'is-bash' };
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls' };
    expect(predicateHandler.matches(matcher as any, ctx)).toBe(true);
  });

  it('returns false when predicate returns false', () => {
    predicateRegistry.register('always-false', () => false);
    const matcher: GuardrailMatcher = { type: 'predicate', predicateName: 'always-false' };
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls' };
    expect(predicateHandler.matches(matcher as any, ctx)).toBe(false);
  });

  it('throws when predicateName is not registered', () => {
    const matcher: GuardrailMatcher = { type: 'predicate', predicateName: 'unknown' };
    const ctx: ToolCallContext = { toolName: 'bash', command: 'ls' };
    expect(() => predicateHandler.matches(matcher as any, ctx)).toThrow('Predicate "unknown" is not registered');
  });
});
