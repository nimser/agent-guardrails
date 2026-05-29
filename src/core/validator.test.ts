import { describe, it, expect } from 'vitest';
import { validateRule, validateRulePack } from './validator';
import type { GuardrailRule, RulePack } from './types';

function validRule(overrides: Partial<GuardrailRule> = {}): GuardrailRule {
  return {
    id: 'test.rule',
    title: 'Test Rule',
    description: 'A test rule',
    phase: 'before-tool',
    match: { type: 'bash-command', pattern: /test/i },
    defaultAction: { type: 'block', message: 'Blocked: {matched}' },
    ...overrides,
  };
}

describe('validateRule', () => {
  it('passes a valid rule', () => {
    const result = validateRule(validRule());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails on missing required field id', () => {
    const rule = validRule();
    (rule as any).id = '';
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
  });

  it('fails on missing required field title', () => {
    const rule = validRule();
    (rule as any).title = '';
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
  });

  it('fails on missing required field description', () => {
    const rule = validRule();
    (rule as any).description = '';
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
  });

  it('fails when phase is after-tool and action type is block', () => {
    const rule = validRule({
      phase: 'after-tool',
      defaultAction: { type: 'block', message: 'nope' },
    });
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('after-tool'))).toBe(true);
  });

  it('fails when phase is after-tool and action type is suggest', () => {
    const rule = validRule({
      phase: 'after-tool',
      defaultAction: { type: 'suggest', replacement: 'x' },
    });
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
  });

  it('fails when phase is after-tool and action type is run', () => {
    const rule = validRule({
      phase: 'after-tool',
      defaultAction: { type: 'run', replacement: 'x' },
    });
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
  });

  it('fails when phase is after-tool and action type is confirm', () => {
    const rule = validRule({
      phase: 'after-tool',
      defaultAction: { type: 'confirm', message: 'x' },
    });
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
  });

  it('passes when phase is after-tool and action type is redact', () => {
    const rule = validRule({
      phase: 'after-tool',
      defaultAction: { type: 'redact', replacement: '[REDACTED]' },
    });
    const result = validateRule(rule);
    expect(result.valid).toBe(true);
  });

  it('fails when phase is before-tool and action type is redact', () => {
    const rule = validRule({
      phase: 'before-tool',
      defaultAction: { type: 'redact', replacement: '[REDACTED]' },
    });
    const result = validateRule(rule);
    expect(result.valid).toBe(false);
  });

  it('passes when phase is before-tool and action type is allow', () => {
    const rule = validRule({
      phase: 'before-tool',
      defaultAction: { type: 'allow' },
    });
    const result = validateRule(rule);
    expect(result.valid).toBe(true);
  });
});

describe('validateRulePack', () => {
  function validPack(overrides: Partial<RulePack> = {}): RulePack {
    return {
      id: 'test-pack',
      name: 'Test Pack',
      description: 'A test pack',
      rules: [validRule()],
      ...overrides,
    };
  }

  it('passes a valid pack', () => {
    const result = validateRulePack(validPack());
    expect(result.valid).toBe(true);
  });

  it('fails on duplicate rule IDs', () => {
    const rule1 = validRule({ id: 'dup' });
    const rule2 = validRule({ id: 'dup' });
    const result = validateRulePack(validPack({ rules: [rule1, rule2] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  it('fails when a rule is invalid', () => {
    const badRule = validRule({ phase: 'after-tool', defaultAction: { type: 'block', message: 'x' } });
    const result = validateRulePack(validPack({ rules: [badRule] }));
    expect(result.valid).toBe(false);
  });

  it('fails on missing pack id', () => {
    const result = validateRulePack(validPack({ id: '' }));
    expect(result.valid).toBe(false);
  });

  it('fails on missing pack name', () => {
    const result = validateRulePack(validPack({ name: '' }));
    expect(result.valid).toBe(false);
  });
});
