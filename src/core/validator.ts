import type {
  AfterToolAction,
  BeforeToolAction,
  GuardrailMatcher,
  GuardrailRule,
  RulePack,
} from './types.js'

const VALID_PHASES = new Set(['before-tool', 'after-tool'])

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object'
}

function isGuardrailMatcher(v: unknown): v is GuardrailMatcher {
  if (!isObject(v)) return false

  switch (v.type) {
    case 'bash-command':
    case 'file-path':
      return v.pattern instanceof RegExp
    case 'predicate':
      return typeof v.predicateName === 'string' && v.predicateName.length > 0
    default:
      return false
  }
}

function isBeforeToolAction(v: unknown): v is BeforeToolAction {
  if (!isObject(v)) return false

  switch (v.type) {
    case 'allow':
      return true
    case 'block':
      return typeof v.message === 'string'
    case 'suggest':
      return (
        typeof v.replacement === 'string' &&
        (v.message === undefined || typeof v.message === 'string')
      )
    case 'run':
      return (
        typeof v.replacement === 'string' &&
        (v.message === undefined || typeof v.message === 'string')
      )
    case 'confirm': {
      if (typeof v.message !== 'string') return false
      if (v.fallback !== undefined && !isBeforeToolAction(v.fallback)) return false
      return true
    }
    default:
      return false
  }
}

function isAfterToolAction(v: unknown): v is AfterToolAction {
  return isObject(v) && v.type === 'redact' && typeof v.replacement === 'string'
}

export function validateRule(input: unknown): input is GuardrailRule {
  return getRuleErrors(input).length === 0
}

export function getRuleErrors(input: unknown): string[] {
  const errors: string[] = []

  if (!isObject(input)) {
    return ['Rule is not an object']
  }

  if (typeof input.id !== 'string' || !input.id) errors.push('Rule "id" is required')
  if (typeof input.title !== 'string' || !input.title) errors.push('Rule "title" is required')
  if (typeof input.description !== 'string' || !input.description)
    errors.push('Rule "description" is required')

  if (typeof input.phase !== 'string' || !VALID_PHASES.has(input.phase)) {
    errors.push('Rule "phase" must be "before-tool" or "after-tool"')
  }

  if (!isGuardrailMatcher(input.match)) {
    errors.push('Rule "match" is invalid or malformed')
  }

  if (typeof input.phase === 'string' && VALID_PHASES.has(input.phase)) {
    if (input.phase === 'before-tool' && !isBeforeToolAction(input.defaultAction)) {
      errors.push('Rule "defaultAction" is invalid for before-tool phase')
    } else if (input.phase === 'after-tool' && !isAfterToolAction(input.defaultAction)) {
      errors.push('Rule "defaultAction" must be a redact action for after-tool phase')
    }
  }

  return errors
}

export function validateRulePack(input: unknown): input is RulePack {
  return getRulePackErrors(input).length === 0
}

export function getRulePackErrors(input: unknown): string[] {
  const errors: string[] = []

  if (!isObject(input)) {
    return ['RulePack is not an object']
  }

  if (typeof input.id !== 'string' || !input.id)
    errors.push('RulePack "id" is required')
  if (typeof input.name !== 'string' || !input.name)
    errors.push('RulePack "name" is required')
  if (typeof input.description !== 'string' || !input.description)
    errors.push('RulePack "description" is required')

  if (!Array.isArray(input.rules)) {
    errors.push('RulePack "rules" must be an array')
    return errors
  }

  const ids = new Set<string>()
  for (const rule of input.rules) {
    if (!isObject(rule)) {
      errors.push('RulePack contains a non-object rule')
      continue
    }
    if (typeof rule.id === 'string' && rule.id) {
      if (ids.has(rule.id)) {
        errors.push(`duplicate rule id "${rule.id}"`)
      }
      ids.add(rule.id)
    }

    const ruleErrors = getRuleErrors(rule)
    if (ruleErrors.length > 0) {
      const ruleLabel = typeof rule.id === 'string' ? rule.id : '<unknown>'
      errors.push(...ruleErrors.map((e) => `rule "${ruleLabel}": ${e}`))
    }
  }

  return errors
}
