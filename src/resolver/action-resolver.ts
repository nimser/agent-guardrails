import type { GuardrailAction, HarnessCapabilities } from "../core/types.js";

/**
 * Interpolation context for guardrail action messages.
 * `{matched}` is replaced with the matched command or file path.
 * `{replacement}` is replaced with the suggested/replacement command.
 */
export interface ResolveContext {
  matched?: string;
  replacement?: string;
}

function interpolate(message: string, ctx: ResolveContext): string {
  let result = message;
  if (ctx.matched !== undefined) {
    result = result.replaceAll("{matched}", ctx.matched);
  }
  if (ctx.replacement !== undefined) {
    result = result.replaceAll("{replacement}", ctx.replacement);
  }
  return result;
}

function interpolateMessage(message: string | undefined, ctx: ResolveContext): string | undefined {
  if (message === undefined) return undefined;
  return interpolate(message, ctx);
}

/**
 * Resolve a GuardrailAction against HarnessCapabilities, walking the fallback chain
 * when a behavior is not supported.
 *
 * Fallback chains:
 * - run → suggest → block
 * - confirm → suggest → block
 * - redact → block (when unsupported)
 * - suggest → block (when unsupported)
 */
export function resolveAction(
  action: GuardrailAction,
  capabilities: HarnessCapabilities,
  ctx: ResolveContext = {},
): GuardrailAction {
  switch (action.type) {
    case "allow":
      return action;
    case "block":
      return resolveBlock(action, ctx);
    case "suggest":
      return resolveSuggest(action, capabilities, ctx);
    case "run":
      return resolveRun(action, capabilities, ctx);
    case "redact":
      return resolveRedact(action, capabilities, ctx);
    case "confirm":
      return resolveConfirm(action, capabilities, ctx);
  }
}

function resolveBlock(
  action: Extract<GuardrailAction, { type: "block" }>,
  ctx: ResolveContext,
): GuardrailAction {
  return {
    type: "block",
    message: interpolate(action.message, ctx),
  };
}

function resolveSuggest(
  action: Extract<GuardrailAction, { type: "suggest" }>,
  capabilities: HarnessCapabilities,
  ctx: ResolveContext,
): GuardrailAction {
  if (!capabilities.suggest) {
    return blockWithReason(action.message, "capability unavailable.", ctx);
  }
  const replacement = action.replacement;
  return {
    type: "suggest",
    replacement,
    message: interpolateMessage(action.message, { ...ctx, replacement }),
  };
}

function resolveRun(
  action: Extract<GuardrailAction, { type: "run" }>,
  capabilities: HarnessCapabilities,
  ctx: ResolveContext,
): GuardrailAction {
  if (capabilities.run) {
    const replacement = action.replacement;
    return {
      type: "run",
      replacement,
      message: interpolateMessage(action.message, { ...ctx, replacement }),
    };
  }
  if (capabilities.suggest && action.replacement) {
    const replacement = action.replacement;
    return {
      type: "suggest",
      replacement,
      message: interpolateMessage(action.message, { ...ctx, replacement }),
    };
  }
  return blockWithReason(action.message, "no Replacement available.", ctx);
}

function resolveRedact(
  action: Extract<GuardrailAction, { type: "redact" }>,
  capabilities: HarnessCapabilities,
  ctx: ResolveContext,
): GuardrailAction {
  if (capabilities.redact) {
    return { type: "redact", replacement: action.replacement };
  }
  return {
    type: "block",
    message: interpolate(`Blocked: \`${ctx.matched ?? ""}\` — redact capability unavailable.`, ctx),
  };
}

function resolveConfirm(
  action: Extract<GuardrailAction, { type: "confirm" }>,
  capabilities: HarnessCapabilities,
  ctx: ResolveContext,
): GuardrailAction {
  if (capabilities.confirm) {
    return {
      type: "confirm",
      message: interpolate(action.message, ctx),
      fallback: action.fallback,
    };
  }
  if (action.fallback) {
    return resolveAction(action.fallback, capabilities, ctx);
  }
  if (capabilities.suggest && ctx.replacement) {
    return {
      type: "suggest",
      replacement: ctx.replacement,
      message: interpolate(action.message, ctx),
    };
  }
  return blockWithReason(action.message, "no Replacement available.", ctx);
}

function blockWithReason(
  message: string | undefined,
  reason: string,
  ctx: ResolveContext,
): GuardrailAction {
  return {
    type: "block",
    message: interpolate(
      message ? `Blocked: ${message}` : `Blocked: \`${ctx.matched ?? ""}\` — ${reason}`,
      ctx,
    ),
  };
}
