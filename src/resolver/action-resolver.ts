import type { GuardrailAction, HarnessCapabilities } from '../core/types.js';

export interface ResolveContext {
  matched?: string;
  replacement?: string;
}

function interpolate(message: string, ctx: ResolveContext): string {
  let result = message;
  if (ctx.matched !== undefined) {
    result = result.replace(/\{matched\}/g, ctx.matched);
  }
  if (ctx.replacement !== undefined) {
    result = result.replace(/\{replacement\}/g, ctx.replacement);
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
  ctx: ResolveContext = {}
): GuardrailAction {
  switch (action.type) {
    case 'allow':
      return action;

    case 'block':
      return {
        type: 'block',
        message: interpolate(action.message, ctx),
      };

    case 'suggest': {
      if (capabilities.suggest) {
        const replacement = action.replacement;
        const resolvedCtx = { ...ctx, replacement };
        return {
          type: 'suggest',
          replacement,
          message: interpolateMessage(action.message, resolvedCtx),
        };
      }
      return {
        type: 'block',
        message: interpolate(
          action.message 
            ? `Blocked: ${action.message}` 
            : `Blocked: \`${ctx.matched ?? ''}\` — capability unavailable.`,
          ctx
        ),
      };
    }

    case 'run': {
      if (capabilities.run) {
        const replacement = action.replacement;
        const resolvedCtx = { ...ctx, replacement };
        return {
          type: 'run',
          replacement,
          message: interpolateMessage(action.message, resolvedCtx),
        };
      }
      if (capabilities.suggest && action.replacement) {
        const replacement = action.replacement;
        const resolvedCtx = { ...ctx, replacement };
        return {
          type: 'suggest',
          replacement,
          message: interpolateMessage(action.message, resolvedCtx),
        };
      }
      return {
        type: 'block',
        message: interpolate(
          action.message 
            ? `Blocked: ${action.message}` 
            : `Blocked: \`${ctx.matched ?? ''}\` — no Replacement available.`,
          ctx
        ),
      };
    }

    case 'redact': {
      if (capabilities.redact) {
        return {
          type: 'redact',
          replacement: action.replacement,
        };
      }
      return {
        type: 'block',
        message: interpolate(
          `Blocked: \`${ctx.matched ?? ''}\` — redact capability unavailable.`,
          ctx
        ),
      };
    }

    case 'confirm': {
      if (capabilities.confirm) {
        return {
          type: 'confirm',
          message: interpolate(action.message, ctx),
          fallback: action.fallback,
        };
      }
      if (action.fallback) {
        return resolveAction(action.fallback, capabilities, ctx);
      }
      if (capabilities.suggest && ctx.replacement) {
        return {
          type: 'suggest',
          replacement: ctx.replacement,
          message: interpolate(action.message, ctx),
        };
      }
      return {
        type: 'block',
        message: interpolate(
          action.message 
            ? `Blocked: ${action.message}` 
            : `Blocked: \`${ctx.matched ?? ''}\` — no Replacement available.`,
          ctx
        ),
      };
    }
  }
}
