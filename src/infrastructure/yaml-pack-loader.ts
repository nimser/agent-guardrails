import { readFileSync, readdirSync, statSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { join } from 'path';
import { PredicateRegistry } from '../core/predicate-registry.js';
import { validateRulePack, getRulePackErrors } from '../core/validator.js';
import type { GuardrailMatcher, GuardrailAction, BeforeToolAction, RulePack } from '../core/types.js';

export function loadYamlRulePack(
  filePath: string,
  predicateRegistry: PredicateRegistry
): RulePack {
  const content = readFileSync(filePath, 'utf-8');
  const raw = parseYaml(content);

  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid YAML file: ${filePath}`);
  }

  const { id, name, description, rules: rawRules } = raw;

  if (!id || !name || !description) {
    throw new Error(`Rule pack missing required fields (id, name, description): ${filePath}`);
  }

  if (!Array.isArray(rawRules)) {
    throw new Error(`Rule pack "rules" must be an array: ${filePath}`);
  }

  const rules = rawRules.map((rawRule: any, index: number) => {
    if (!rawRule.id || !rawRule.title || !rawRule.description || !rawRule.phase || !rawRule.match || !rawRule.defaultAction) {
      throw new Error(`Rule #${index} in ${filePath} missing required fields`);
    }

    const match = parseMatcher(rawRule.match, predicateRegistry, filePath);
    const defaultAction = parseAction(rawRule.defaultAction);

    return {
      id: rawRule.id,
      title: rawRule.title,
      description: rawRule.description,
      phase: rawRule.phase,
      match,
      defaultAction,
    };
  });

  const pack: unknown = { id, name, description, rules };

  if (!validateRulePack(pack)) {
    const errors = getRulePackErrors(pack);
    throw new Error(`Rule pack "${id}" validation failed: ${errors.join('; ')}`);
  }

  return pack;
}

export function loadAllRulePacks(
  packDir: string,
  predicateRegistry: PredicateRegistry
): RulePack[] {
  const packs: RulePack[] = [];

  let entries: string[];
  try {
    entries = readdirSync(packDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const fullPath = join(packDir, entry);
    try {
      const stat = statSync(fullPath);
      if (!stat.isFile()) continue;
      if (!entry.endsWith('.yaml') && !entry.endsWith('.yml')) continue;

      const pack = loadYamlRulePack(fullPath, predicateRegistry);
      packs.push(pack);
    } catch (err) {
      throw new Error(`Failed to load rule pack ${fullPath}: ${(err as Error).message}`);
    }
  }

  return packs;
}

function parseMatcher(
  raw: any,
  predicateRegistry: PredicateRegistry,
  filePath: string
): GuardrailMatcher {
  if (!raw.type) {
    throw new Error(`Matcher missing "type" field in ${filePath}`);
  }

  switch (raw.type) {
    case 'bash-command': {
      if (typeof raw.pattern !== 'string') {
        throw new Error(`bash-command matcher requires string pattern: ${filePath}`);
      }
      try {
        return { type: 'bash-command', pattern: new RegExp(raw.pattern) };
      } catch (err) {
        throw new Error(
          `Invalid regex "${raw.pattern}" in ${filePath}: ${(err as Error).message}`
        );
      }
    }
    case 'file-path': {
      if (typeof raw.pattern !== 'string') {
        throw new Error(`file-path matcher requires string pattern: ${filePath}`);
      }
      try {
        return { type: 'file-path', pattern: new RegExp(raw.pattern) };
      } catch (err) {
        throw new Error(
          `Invalid regex "${raw.pattern}" in ${filePath}: ${(err as Error).message}`
        );
      }
    }
    case 'predicate': {
      if (typeof raw.predicateName !== 'string') {
        throw new Error(`predicate matcher requires string predicateName: ${filePath}`);
      }
      const fn = predicateRegistry.resolve(raw.predicateName);
      if (!fn) {
        throw new Error(`Unknown predicate "${raw.predicateName}" in ${filePath}`);
      }
      // Return with predicateName — the predicate handler will resolve it
      return { type: 'predicate', predicateName: raw.predicateName };
    }
    default:
      throw new Error(`Unknown matcher type "${raw.type}" in ${filePath}`);
  }
}

function parseAction(raw: any): GuardrailAction {
  if (!raw.type) {
    throw new Error('Action missing "type" field');
  }

  switch (raw.type) {
    case 'allow':
      return { type: 'allow' };
    case 'block':
      return { type: 'block', message: raw.message || '' };
    case 'suggest':
      return {
        type: 'suggest',
        replacement: raw.replacement || '',
        message: raw.message,
      };
    case 'run':
      return {
        type: 'run',
        replacement: raw.replacement || '',
        message: raw.message,
      };
    case 'redact':
      return { type: 'redact', replacement: raw.replacement || '' };
    case 'confirm':
      return {
        type: 'confirm',
        message: raw.message || '',
        fallback: raw.fallback ? parseBeforeToolAction(raw.fallback) : undefined,
      };
    default:
      throw new Error(`Unknown action type "${raw.type}"`);
  }
}

function parseBeforeToolAction(raw: any): BeforeToolAction {
  const action = parseAction(raw);
  if (action.type === 'redact') {
    throw new Error('redact action is not allowed in before-tool context');
  }
  return action;
}
