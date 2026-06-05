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
  const { command, filePath } = extractTargets(ctx);

  if (!command && !filePath) {
    return handleMissingTargets(ctx, statsTracker);
  }

  const commands = command ? splitCommands(command) : [""];
  const action = findFirstMatch(ctx, commands, packs, capabilities);
  statsTracker.record(action ?? null);
  return action;
}

function extractTargets(ctx: ToolCallContext): { command?: string; filePath?: string } {
  return {
    command: "command" in ctx ? ctx.command : undefined,
    filePath: "filePath" in ctx ? ctx.filePath : undefined,
  };
}

// Known tools require specific fields (bash→command, read/write→filePath).
// Fail closed to prevent guardrail bypass via malformed tool call contexts.
function handleMissingTargets(
  ctx: ToolCallContext,
  tracker: StatsTracker,
): GuardrailAction | undefined {
  if (!REQUIRES_KNOWN_FIELDS.has(ctx.toolName)) {
    tracker.record(null);
    return undefined;
  }
  const action: GuardrailAction = {
    type: "block",
    message: `Malformed ${ctx.toolName} tool call: missing required fields`,
  };
  tracker.record(action);
  return action;
}

const REQUIRES_KNOWN_FIELDS = new Set(["bash", "read", "write"]);

function findFirstMatch(
  ctx: ToolCallContext,
  commands: string[],
  packs: RulePack[],
  capabilities: HarnessCapabilities,
): GuardrailAction | undefined {
  for (const cmd of commands) {
    const matchCtx = { ...ctx, command: cmd } as ToolCallContext;
    for (const pack of packs) {
      const action = matchPackRules(pack, matchCtx, capabilities, ctx, cmd);
      if (action) return action;
    }
  }
  return undefined;
}

function matchPackRules(
  pack: RulePack,
  matchCtx: ToolCallContext,
  capabilities: HarnessCapabilities,
  ctx: ToolCallContext,
  cmd: string,
): GuardrailAction | undefined {
  for (const rule of pack.rules) {
    if (rule.phase !== "before-tool") continue;
    if (!matcherRegistry.evaluate(rule.match, matchCtx)) continue;

    const matchedValue = cmd || ctx.filePath || "";
    return resolveAction(rule.defaultAction, capabilities, { matched: matchedValue });
  }
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
