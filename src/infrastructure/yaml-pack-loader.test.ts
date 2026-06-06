import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadYamlRulePack, loadAllRulePacks } from './yaml-pack-loader.js'
import { PredicateRegistry } from '../core/predicate-registry.js'
import { mkdirSync, rmSync, cpSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const fixturesDir = join(fileURLToPath(import.meta.url), '..', '__fixtures__')

describe('loadYamlRulePack', () => {
  let testDir: string
  let predicateRegistry: PredicateRegistry

  beforeEach(() => {
    testDir = join(tmpdir(), `guardrails-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    predicateRegistry = new PredicateRegistry()
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  function fixture(name: string): string {
    return join(fixturesDir, name)
  }

  it('loads a valid YAML rule pack with bash-command matcher', () => {
    const pack = loadYamlRulePack(fixture('valid-bash.yaml'), predicateRegistry)

    expect(pack.id).toBe('test-pack')
    expect(pack.name).toBe('Test Pack')
    expect(pack.rules).toHaveLength(1)
    expect(pack.rules[0].id).toBe('block-rm')
    expect(pack.rules[0].match.type).toBe('bash-command')
    if (pack.rules[0].match.type === 'bash-command') {
      expect(pack.rules[0].match.pattern).toBeInstanceOf(RegExp)
      expect(pack.rules[0].match.pattern.test('rm -rf /')).toBe(true)
    }
  })

  it('loads a YAML rule pack with file-path matcher', () => {
    const pack = loadYamlRulePack(fixture('valid-file-path.yaml'), predicateRegistry)

    expect(pack.rules[0].match.type).toBe('file-path')
    if (pack.rules[0].match.type === 'file-path') {
      expect(pack.rules[0].match.pattern).toBeInstanceOf(RegExp)
      expect(pack.rules[0].match.pattern.test('/home/user/.env')).toBe(true)
    }
  })

  it('loads a YAML rule pack with predicate matcher', () => {
    predicateRegistry.register('has-private-key', (ctx) => {
      return ctx.toolName === 'read' && ctx.filePath?.includes('.ssh') === true
    })

    const pack = loadYamlRulePack(fixture('valid-predicate.yaml'), predicateRegistry)

    expect(pack.rules[0].match.type).toBe('predicate')
    if (pack.rules[0].match.type === 'predicate') {
      expect(pack.rules[0].match.predicateName).toBe('has-private-key')
    }
  })

  it('throws error for unregistered predicate', () => {
    expect(() =>
      loadYamlRulePack(fixture('unregistered-predicate.yaml'), predicateRegistry)
    ).toThrow(/unknown-predicate/)
  })

  it('throws error for invalid YAML syntax', () => {
    expect(() => loadYamlRulePack(fixture('invalid-yaml.txt'), predicateRegistry)).toThrow()
  })

  it('throws when YAML is an array instead of mapping', () => {
    expect(() => loadYamlRulePack(fixture('yaml-array.yaml'), predicateRegistry)).toThrow(
      /must be a mapping/
    )
  })

  it('throws error for missing required pack fields', () => {
    expect(() => loadYamlRulePack(fixture('missing-pack-fields.yaml'), predicateRegistry)).toThrow(
      /description|rules/i
    )
  })

  it('throws when rules is not an array', () => {
    expect(() => loadYamlRulePack(fixture('rules-not-array.yaml'), predicateRegistry)).toThrow(
      /"rules" must be an array/
    )
  })

  it('throws when a rule is missing required fields', () => {
    expect(() => loadYamlRulePack(fixture('rule-missing-fields.yaml'), predicateRegistry)).toThrow(
      /missing required fields/
    )
  })

  it('validates the loaded rule pack', () => {
    expect(() => loadYamlRulePack(fixture('duplicate-ids.yaml'), predicateRegistry)).toThrow(
      /duplicate/i
    )
  })

  it('loads multiple rules from a single pack', () => {
    const pack = loadYamlRulePack(fixture('valid-multi-rule.yaml'), predicateRegistry)
    expect(pack.rules).toHaveLength(2)
  })

  // -- matcher error paths --

  it('throws when matcher is missing type field', () => {
    expect(() => loadYamlRulePack(fixture('matcher-missing-type.yaml'), predicateRegistry)).toThrow(
      /missing "type" field/
    )
  })

  it('throws on invalid regex in bash-command matcher', () => {
    expect(() => loadYamlRulePack(fixture('invalid-regex-bash.yaml'), predicateRegistry)).toThrow(
      /Invalid regex/
    )
  })

  it('throws on invalid regex in file-path matcher', () => {
    expect(() => loadYamlRulePack(fixture('invalid-regex-file.yaml'), predicateRegistry)).toThrow(
      /Invalid regex/
    )
  })

  it('throws when bash-command pattern is not a string', () => {
    expect(() =>
      loadYamlRulePack(fixture('bash-pattern-not-string.yaml'), predicateRegistry)
    ).toThrow(/requires string pattern/)
  })

  it('throws when file-path pattern is not a string', () => {
    expect(() =>
      loadYamlRulePack(fixture('file-path-pattern-not-string.yaml'), predicateRegistry)
    ).toThrow(/requires string pattern/)
  })

  it('throws when predicateName is not a string', () => {
    expect(() =>
      loadYamlRulePack(fixture('predicate-name-not-string.yaml'), predicateRegistry)
    ).toThrow(/requires string predicateName/)
  })

  it('throws on unknown matcher type', () => {
    expect(() => loadYamlRulePack(fixture('unknown-matcher-type.yaml'), predicateRegistry)).toThrow(
      /Unknown matcher type "custom-matcher"/
    )
  })

  // -- action variants --

  it('loads rule with allow action', () => {
    const pack = loadYamlRulePack(fixture('action-allow.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({ type: 'allow' })
  })

  it('loads block action without message', () => {
    const pack = loadYamlRulePack(fixture('action-block-no-message.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({ type: 'block', message: '' })
  })

  it('loads rule with suggest action', () => {
    const pack = loadYamlRulePack(fixture('action-suggest.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({
      type: 'suggest',
      replacement: 'safe-cmd',
      message: 'Try this',
    })
  })

  it('loads suggest action without replacement or message', () => {
    const pack = loadYamlRulePack(fixture('action-suggest-minimal.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({
      type: 'suggest',
      replacement: '',
      message: undefined,
    })
  })

  it('loads rule with run action', () => {
    const pack = loadYamlRulePack(fixture('action-run.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({
      type: 'run',
      replacement: 'safe-cmd',
      message: 'Running',
    })
  })

  it('loads run action without replacement', () => {
    const pack = loadYamlRulePack(fixture('action-run-minimal.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({
      type: 'run',
      replacement: '',
      message: undefined,
    })
  })

  it('loads redact action without replacement', () => {
    const pack = loadYamlRulePack(fixture('action-redact-minimal.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({ type: 'redact', replacement: '' })
  })

  it('loads confirm action without message or fallback', () => {
    const pack = loadYamlRulePack(fixture('action-confirm-minimal.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({
      type: 'confirm',
      message: '',
      fallback: undefined,
    })
  })

  it('loads rule with confirm action having valid block fallback', () => {
    const pack = loadYamlRulePack(fixture('action-confirm-with-fallback.yaml'), predicateRegistry)
    expect(pack.rules[0].defaultAction).toEqual({
      type: 'confirm',
      message: 'Confirm?',
      fallback: { type: 'block', message: 'Cancelled' },
    })
  })

  it('throws on unknown action type', () => {
    expect(() => loadYamlRulePack(fixture('unknown-action-type.yaml'), predicateRegistry)).toThrow(
      /Unknown action type "explode"/
    )
  })

  it('throws when redact is used as confirm fallback', () => {
    expect(() => loadYamlRulePack(fixture('redact-fallback.yaml'), predicateRegistry)).toThrow(
      /redact action is not allowed in before-tool context/
    )
  })

  it('throws when action is missing type field', () => {
    expect(() => loadYamlRulePack(fixture('action-missing-type.yaml'), predicateRegistry)).toThrow(
      /Action missing "type" field/
    )
  })
})

describe('loadAllRulePacks', () => {
  let testDir: string
  let predicateRegistry: PredicateRegistry

  beforeEach(() => {
    testDir = join(tmpdir(), `guardrails-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    predicateRegistry = new PredicateRegistry()
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  function copyFixture(name: string) {
    cpSync(join(fixturesDir, name), join(testDir, name))
  }

  it('loads all .yaml files from a directory', () => {
    copyFixture('valid-pack1.yaml')
    copyFixture('valid-pack2.yaml')
    cpSync(join(fixturesDir, 'valid-pack1.yaml'), join(testDir, 'readme.txt'))

    const packs = loadAllRulePacks(testDir, predicateRegistry)

    expect(packs).toHaveLength(2)
    expect(packs.map((p) => p.id).sort()).toEqual(['pack1', 'pack2'])
  })

  it('returns empty array for empty directory', () => {
    const packs = loadAllRulePacks(testDir, predicateRegistry)
    expect(packs).toHaveLength(0)
  })

  it('throws error for non-existent directory', () => {
    expect(() => loadAllRulePacks('/tmp/non-existent-dir-xyz', predicateRegistry)).toThrow(
      /Failed to read rule pack directory/
    )
  })

  it('accepts .yml extension', () => {
    copyFixture('yml-extension.yml')

    const packs = loadAllRulePacks(testDir, predicateRegistry)
    expect(packs).toHaveLength(1)
    expect(packs[0].id).toBe('yml-pack')
  })

  it('skips subdirectories in pack directory', () => {
    mkdirSync(join(testDir, 'subdir.yaml'), { recursive: true })
    copyFixture('valid-pack1.yaml')

    const packs = loadAllRulePacks(testDir, predicateRegistry)
    expect(packs).toHaveLength(1)
    expect(packs[0].id).toBe('pack1')
  })

  it('throws error if any pack fails validation', () => {
    copyFixture('valid-pack1.yaml')
    copyFixture('duplicate-ids.yaml')

    expect(() => loadAllRulePacks(testDir, predicateRegistry)).toThrow(/duplicate/i)
  })
})
