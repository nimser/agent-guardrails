import { describe, expect, it, vi } from 'vitest'
import type { PiContext, PiHookResponse } from './index.js'
import type { PiToolCallEvent } from './normalize.js'

vi.mock('../../engine/create-engine.js', () => ({
  createEngine: () => ({
    evaluate: () => {
      throw new Error('boom')
    },
    processMatch: () => {
      throw new Error('boom')
    },
    getStats: () => ({ blocks: 0, suggests: 0 }),
    resetStats: () => {},
  }),
}))

describe('pi adapter fail-closed', () => {
  it('blocks the tool call when the engine throws', async () => {
    const { default: piGuardrails } = await import('./index.js')
    let toolCall:
      | ((event: PiToolCallEvent, ctx: PiContext) => Promise<PiHookResponse | undefined>)
      | undefined
    piGuardrails({
      on: (event: string, handler: unknown) => {
        if (event === 'tool_call') toolCall = handler as typeof toolCall
      },
    })
    if (!toolCall) throw new Error('tool_call handler not registered')
    const ctx: PiContext = { ui: { notify: () => {} } }
    const result = await toolCall({ toolName: 'bash', input: { command: 'ls' } }, ctx)
    expect(result).toMatchObject({ block: true })
    expect(result?.reason).toContain('boom')
  })
})
