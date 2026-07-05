import type { HarnessCapabilities } from './types.js'

/**
 * Pi (Tier 1, ADR-009): in-process plugin with a live session handle.
 * All behaviors bind natively; in-process placement means no tamper resistance (ADR-007).
 */
export const PI_CAPABILITIES: HarnessCapabilities = {
  block: true,
  suggest: true,
  run: true,
  redact: true,
  confirm: true,
  redactUserInput: true,
  tamperResistant: false,
  haltTurnBeforeTool: true,
  haltTurnAfterTool: true,
}

/**
 * Claude Code version from which PostToolUse `updatedToolOutput` applies to
 * all tools, enabling the `redact` behavior (ADR-002).
 */
export const CLAUDE_CODE_REDACT_MIN_VERSION = '2.1.121'

/**
 * Claude Code (Tier 1, ADR-009): out-of-process hooks binding all five
 * behaviors natively. `redact` requires Claude Code ≥ 2.1.121 — use
 * {@link claudeCodeCapabilities} to gate on the installed version.
 */
export const CLAUDE_CODE_CAPABILITIES: HarnessCapabilities = {
  block: true,
  suggest: true,
  run: true,
  redact: true,
  confirm: true,
  redactUserInput: true,
  tamperResistant: true,
  haltTurnBeforeTool: true,
  haltTurnAfterTool: true,
}

/**
 * Claude Code capabilities gated on the installed CLI version: below the
 * `redact` version floor (2.1.121), `redact` is declared false and the
 * engine's `redact → block` fallback applies.
 */
export function claudeCodeCapabilities(version: string): HarnessCapabilities {
  const meetsFloor = compareVersions(version, CLAUDE_CODE_REDACT_MIN_VERSION) >= 0
  return { ...CLAUDE_CODE_CAPABILITIES, redact: meetsFloor }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
