import type { MatchCondition, ToolCallContext } from '../core/types.js'
import type { PredicateRegistry } from '../core/predicate-registry.js'

/**
 * Maximum input string length (in characters) that regex-based matchers
 * will attempt to match against. Inputs longer than this are blocked
 * (fail-closed) rather than allowed through.
 *
 * This bounds worst-case regex evaluation time as a mitigation against
 * community-contributed rule packs that may contain patterns susceptible
 * to catastrophic backtracking. For bash commands and file paths, 4 KB
 * is well above any legitimate input length (PATH_MAX on Linux is 4096;
 * shell commands rarely exceed a few hundred bytes).
 *
 * Returning `true` (match/block) when the limit is exceeded prevents an
 * adversarial LLM from bypassing guardrails by crafting oversized inputs.
 */
export const MAX_MATCH_INPUT_LENGTH = 4096

/**
 * Evaluate a single match condition against a tool call context.
 * The single entry point for matching — no registry, no handlers.
 *
 * @param matcher - The match condition declared on a rule
 * @param ctx - The normalized tool call context
 * @param predicateRegistry - Registry for resolving named predicate matchers
 * @returns true if the condition matches the context
 */
export function matchesMatcher(
  matcher: MatchCondition,
  ctx: ToolCallContext,
  predicateRegistry: PredicateRegistry
): boolean {
  switch (matcher.type) {
    case 'bash-command': {
      // user-input contexts carry the prompt text in `command`, so
      // bash-command patterns apply to it unchanged (ADR-010).
      if ((ctx.toolName !== 'bash' && ctx.toolName !== 'user-input') || !ctx.command) return false
      if (ctx.command.length > MAX_MATCH_INPUT_LENGTH) return true
      // Local copy defends against shared-state regex (global / sticky flags).
      const re = new RegExp(matcher.pattern.source, matcher.pattern.flags)
      return re.test(ctx.command)
    }
    case 'file-path': {
      if (!ctx.filePath) return false
      if (ctx.filePath.length > MAX_MATCH_INPUT_LENGTH) return true
      // Local copy defends against shared-state regex (global / sticky flags).
      const re = new RegExp(matcher.pattern.source, matcher.pattern.flags)
      return re.test(ctx.filePath)
    }
    case 'predicate': {
      const fn = predicateRegistry.resolve(matcher.predicateName)
      if (!fn) {
        throw new Error(
          `Predicate "${matcher.predicateName}" is not registered. ` +
            'Register it via predicateRegistry.register() before loading rule packs that reference it.'
        )
      }
      return fn(ctx)
    }
  }
}
