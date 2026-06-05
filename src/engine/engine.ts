import type {
  ToolCallContext,
  RulePack,
  GuardrailAction,
  HarnessCapabilities,
} from "../core/types.js";
import { matcherRegistry } from "../matcher/registry.js";
import { splitCommands } from "../matcher/command-splitter.js";
import { resolveAction } from "../resolver/action-resolver.js";
import { StatsTracker } from "./stats-tracker.js";

const statsTracker = new StatsTracker();

/**
 * Main engine entry point. Evaluates a ToolCallContext against all rules
 * in the given RulePacks and returns the first matching resolved action.
 * Uses the MatcherRegistry for evaluation and resolveAction for fallback chains.
 *
 * @param ctx - Normalized tool call context
 * @param packs - Rule packs to evaluate against
 * @param capabilities - Harness capability flags
 * @returns The resolved action, or undefined if no rule matched
 */
export function matchAndResolve(
  ctx: ToolCallContext,
  packs: RulePack[],
  capabilities: HarnessCapabilities,
): GuardrailAction | undefined {
  const command = "command" in ctx ? ctx.command : undefined;
  const filePath = "filePath" in ctx ? ctx.filePath : undefined;

  if (!command && !filePath) {
    // Known tools require specific fields (bash→command, read/write→filePath).
    // Fail closed to prevent guardrail bypass via malformed tool call contexts.
    if (ctx.toolName === "bash" || ctx.toolName === "read" || ctx.toolName === "write") {
      const action: GuardrailAction = {
        type: "block",
        message: `Malformed ${ctx.toolName} tool call: missing required fields`,
      };
      statsTracker.record(action);
      return action;
    }
    statsTracker.record(null);
    return undefined;
  }

  const commands = command ? splitCommands(command) : [""];

  for (const cmd of commands) {
    const matchCtx = { ...ctx, command: cmd } as ToolCallContext;

    for (const pack of packs) {
      for (const rule of pack.rules) {
        // This entry point handles the before-tool phase only;
        // after-tool rules are evaluated by a separate path.
        if (rule.phase !== "before-tool") {
          continue;
        }

        const matches = matcherRegistry.evaluate(rule.match, matchCtx);

        if (matches) {
          const matchedValue = cmd || ctx.filePath || "";

          const action = resolveAction(rule.defaultAction, capabilities, { matched: matchedValue });

          statsTracker.record(action);

          return action;
        }
      }
    }
  }

  statsTracker.record(null);
  return undefined;
}

/** Get a snapshot of current intervention stats. */
export function getStats() {
  return statsTracker.getStats();
}

/** Reset intervention stats to zero. */
export function resetStats() {
  statsTracker.resetStats();
}
