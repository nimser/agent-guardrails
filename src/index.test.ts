import { describe, it, expect } from 'vitest'
import * as api from './index.js'

describe('public API surface', () => {
  it('exports PredicateRegistry', () => {
    expect(api.PredicateRegistry).toBeDefined()
    expect(typeof api.PredicateRegistry).toBe('function')
  })

  it('exports validator functions', () => {
    expect(typeof api.validateRule).toBe('function')
    expect(typeof api.validateRulePack).toBe('function')
    expect(typeof api.getRuleErrors).toBe('function')
    expect(typeof api.getRulePackErrors).toBe('function')
  })

  it('exports normalizer functions', () => {
    expect(typeof api.isKnownTool).toBe('function')
    expect(api.isKnownTool('bash')).toBe(true)
    expect(api.isKnownTool('nope')).toBe(false)
    expect(typeof api.extractTargets).toBe('function')
    expect(typeof api.isMissingRequiredFields).toBe('function')
  })

  it('exports engine functions', () => {
    expect(typeof api.initGuardrails).toBe('function')
    expect(typeof api.matchAndResolve).toBe('function')
    expect(typeof api.processMatch).toBe('function')
    expect(typeof api.getStats).toBe('function')
    expect(typeof api.resetStats).toBe('function')
    expect(api.StatsTracker).toBeDefined()
  })

  it('exports YAML rule pack loaders', () => {
    expect(typeof api.loadYamlRulePack).toBe('function')
    expect(typeof api.loadAllRulePacks).toBe('function')
  })
})
