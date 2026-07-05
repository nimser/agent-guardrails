import type { ToolCallContext } from '../../core/types.js'

/** Shape of a Pi `tool_call` event, reduced to the fields the adapter reads. */
export interface PiToolCallEvent {
  toolName: string
  input?: { command?: string; path?: string }
}

/** Normalize a Pi tool_call event into the engine's ToolCallContext. */
export function normalizeToContext(event: PiToolCallEvent): ToolCallContext {
  switch (event.toolName) {
    case 'bash':
      return { toolName: 'bash', command: event.input?.command ?? '' }
    case 'read':
    case 'write':
      return { toolName: event.toolName, filePath: event.input?.path ?? '' }
    default:
      return { toolName: event.toolName }
  }
}
