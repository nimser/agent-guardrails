import { describe, expect, it } from 'vitest'
import piGuardrails from './index.js'
import type { ExtensionAPI, PiContext, PiHookResponse } from './index.js'
import type { PiToolCallEvent } from './normalize.js'

type ToolCallHandler = (
  event: PiToolCallEvent,
  ctx: PiContext
) => Promise<PiHookResponse | undefined>

const EVENTS: PiToolCallEvent[] = [
  { toolName: 'bash', input: { command: 'ls -la' } },
  { toolName: 'bash', input: { command: 'cat .env' } },
  { toolName: 'read', input: { path: 'README.md' } },
  { toolName: 'read', input: { path: '/home/u/.ssh/id_ed25519' } },
  { toolName: 'fetch', input: {} },
]

describe('pi adapter performance', () => {
  it('handles a tool_call in under 10ms with all rule packs loaded', async () => {
    let toolCall: ToolCallHandler | undefined
    const ctx: PiContext = { ui: { notify: () => {} } }
    const pi: ExtensionAPI = {
      on: (event: string, handler: unknown) => {
        if (event === 'tool_call') toolCall = handler as ToolCallHandler
      },
    }
    piGuardrails(pi)

    const samples: number[] = []
    for (let i = 0; i < 500; i++) {
      const event = EVENTS[i % EVENTS.length]
      const start = performance.now()
      await toolCall!(event, ctx)
      samples.push(performance.now() - start)
    }

    samples.sort((a, b) => a - b)
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    const p95 = samples[Math.floor(samples.length * 0.95)]
    const p99 = samples[Math.floor(samples.length * 0.99)]
    // eslint-disable-next-line no-console
    console.log(
      `tool_call latency ms — min ${samples[0].toFixed(3)}, mean ${mean.toFixed(3)}, ` +
        `p95 ${p95.toFixed(3)}, p99 ${p99.toFixed(3)}, max ${samples[samples.length - 1].toFixed(3)}`
    )

    expect(p95).toBeLessThan(10)
    expect(mean).toBeLessThan(10)
  })
})
