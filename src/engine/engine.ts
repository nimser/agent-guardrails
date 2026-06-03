import type { ToolCallContext, RulePack, GuardrailAction, HarnessCapabilities } from '../core/types.js';
import { matcherRegistry } from '../matcher/registry.js';
import { splitCommands } from '../matcher/command-splitter.js';
import { resolveAction } from '../resolver/action-resolver.js';
import { StatsTracker } from './stats-tracker.js';

const statsTracker = new StatsTracker();

/**
 * Match a tool call context against rule packs and resolve the action.
 *
 * @param ctx - Tool call context (bash command, file path, etc.)
 * @param packs - Rule packs to check against
 * @param capabilities - Harness capabilities (what actions are available)
 * @returns Resolved action or undefined if no rule matches
 */
export function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities
): GuardrailAction | undefined {
  // Early exit if no command and no filePath
  if (!ctx.command && !ctx.filePath) {
    statsTracker.record(null);
    return undefined;
  }

  // Split command if present (for multi-line commands)
  const commands = ctx.command ? splitCommands(ctx.command) : [''];

  // Try each split command
  for (const cmd of commands) {
    const matchCtx: ToolCallContext = { ...ctx, command: cmd };

    // Iterate through all packs
    for (const pack of packs) {
      // Check each rule in the pack
      for (const rule of pack.rules) {
        // Phase filtering: only check rules that match the tool phase
        // before-tool rules match bash/read/write operations
        // after-tool rules match after execution (not implemented yet in MVP)
        if (rule.phase !== 'before-tool') {
          continue;
        }

        // Evaluate matcher
        const matches = matcherRegistry.evaluate(rule.match, matchCtx);

        if (matches) {
          const matchedValue = cmd || ctx.filePath || '';

          // Resolve action with capability fallback
          const action = resolveAction(
            rule.defaultAction,
            capabilities,
            { matched: matchedValue }
          );

          // Record stats
          statsTracker.record(action);

          return action;
        }
      }
    }
  }

  // No match found
  statsTracker.record(null);
  return undefined;
}

/**
 * Get current stats (checks, blocks, suggests).
 */
export function getStats() {
  return statsTracker.getStats();
}

/**
 * Reset all stats to zero.
 */
export function resetStats() {
  statsTracker.resetStats();
}
