import type { GuardrailRule, RulePack } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const BEFORE_TOOL_ACTIONS = new Set(['allow', 'block', 'suggest', 'run', 'confirm']);
const AFTER_TOOL_ACTIONS = new Set(['redact']);

export function validateRule(rule: GuardrailRule): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!rule.id) errors.push('Rule "id" is required');
  if (!rule.title) errors.push('Rule "title" is required');
  if (!rule.description) errors.push('Rule "description" is required');
  if (!rule.phase) errors.push('Rule "phase" is required');
  if (!rule.match) errors.push('Rule "match" is required');
  if (!rule.defaultAction) errors.push('Rule "defaultAction" is required');

  // Phase-Behavior Matrix
  if (rule.phase === 'after-tool') {
    if (!AFTER_TOOL_ACTIONS.has(rule.defaultAction.type)) {
      errors.push(
        `after-tool phase only supports "redact" action, got "${rule.defaultAction.type}"`
      );
    }
  } else if (rule.phase === 'before-tool') {
    if (!BEFORE_TOOL_ACTIONS.has(rule.defaultAction.type)) {
      errors.push(
        `before-tool phase does not support "redact" action`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateRulePack(pack: RulePack): ValidationResult {
  const errors: string[] = [];

  if (!pack.id) errors.push('RulePack "id" is required');
  if (!pack.name) errors.push('RulePack "name" is required');
  if (!pack.description) errors.push('RulePack "description" is required');

  // Duplicate rule IDs
  const ids = new Set<string>();
  for (const rule of pack.rules) {
    if (ids.has(rule.id)) {
      errors.push(`duplicate rule id "${rule.id}"`);
    }
    ids.add(rule.id);
  }

  // Validate each rule
  for (const rule of pack.rules) {
    const ruleResult = validateRule(rule);
    if (!ruleResult.valid) {
      errors.push(...ruleResult.errors.map(e => `rule "${rule.id}": ${e}`));
    }
  }

  return { valid: errors.length === 0, errors };
}
