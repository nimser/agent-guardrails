import type { ToolCallContext } from './types.js'

/**
 * Well-known tool names that require specific fields in ToolCallContext.
 * - bash requires `command`
 * - read/write require `filePath`
 *
 * Unknown tool names are allowed through with whatever fields are present.
 */
export const KNOWN_TOOLS = new Set(['bash', 'read', 'write'])

/**
 * Extract the target fields from a ToolCallContext.
 * Returns the `command` and/or `filePath` if present on the context.
 */
export function extractTargets(ctx: ToolCallContext): {
  command?: string
  filePath?: string
} {
  return {
    command: 'command' in ctx ? ctx.command : undefined,
    filePath: 'filePath' in ctx ? ctx.filePath : undefined,
  }
}

/**
 * Check whether a ToolCallContext is missing fields that its toolName requires.
 *
 * Known tools (bash, read, write) must have their canonical field.
 * Unknown tools pass if at least one of command/filePath is present.
 *
 * Used for fail-closed enforcement: a bash call without `command` is
 * blocked rather than silently allowed through.
 */
export function isMissingRequiredFields(
  ctx: ToolCallContext,
  command: string | undefined,
  filePath: string | undefined
): boolean {
  switch (ctx.toolName) {
    case 'bash':
      return !command
    case 'read':
    case 'write':
      return !filePath
    default:
      return !command && !filePath
  }
}
