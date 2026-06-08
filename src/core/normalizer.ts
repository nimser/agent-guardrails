import type { ToolCallContext } from './types.js'

/**
 * Well-known tool names that require specific fields in ToolCallContext.
 * - bash requires `command`
 * - read/write require `filePath`
 *
 * Unknown tool names are allowed through with whatever fields are present.
 *
 * The membership data is held in a private `Set`; external code must use
 * `isKnownTool` to check membership so the engine's enforcement behavior
 * cannot be mutated at runtime.
 */
export const KNOWN_TOOLS = ['bash', 'read', 'write'] as const

const KNOWN_TOOLS_SET: ReadonlySet<string> = new Set(KNOWN_TOOLS)

/**
 * Check whether a tool name is a known tool that requires specific fields
 * in ToolCallContext. Prefer this over importing the membership data
 * directly so the underlying set stays immutable from outside the module.
 */
export function isKnownTool(toolName: string): boolean {
  return KNOWN_TOOLS_SET.has(toolName)
}

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
