import type { GuardrailMatcher, ToolCallContext } from '../core/types';

export interface MatcherHandler<T extends string = string> {
  type: T;
  matches(matcher: Extract<GuardrailMatcher, { type: T }>, ctx: ToolCallContext): boolean;
}

export class MatcherRegistry {
  private handlers = new Map<string, MatcherHandler>();

  register(handler: MatcherHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Matcher handler for type "${handler.type}" is already registered`);
    }
    this.handlers.set(handler.type, handler);
  }

  evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean {
    const handler = this.handlers.get(matcher.type);
    if (!handler) {
      throw new Error(`No handler registered for matcher type "${matcher.type}"`);
    }
    return handler.matches(matcher as any, ctx);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const matcherRegistry = new MatcherRegistry();
