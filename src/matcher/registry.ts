import type { GuardrailMatcher, ToolCallContext } from '../core/types'

/**
 * A handler that knows how to evaluate a specific matcher type.
 * Register these to extend the engine with new matcher types without
 * modifying core code (Open/Closed Principle).
 */
export interface MatcherHandler<T extends string = string> {
  type: T
  matches(matcher: Extract<GuardrailMatcher, { type: T }>, ctx: ToolCallContext): boolean
}

/**
 * Registry of matcher handlers. The engine delegates to the registry
 * rather than using a hardcoded switch, enabling extensibility.
 */
export class MatcherRegistry {
  private handlers = new Map<string, MatcherHandler>()

  /** Register a handler for a specific matcher type. Throws if already registered. */
  register<T extends string>(handler: MatcherHandler<T>): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Matcher handler for type "${handler.type}" is already registered`)
    }
    this.handlers.set(handler.type, handler as unknown as MatcherHandler)
  }

  /** Evaluate a matcher by dispatching to the registered handler for its type. */
  evaluate(matcher: GuardrailMatcher, ctx: ToolCallContext): boolean {
    const handler = this.handlers.get(matcher.type)
    if (!handler) {
      throw new Error(`No handler registered for matcher type "${matcher.type}"`)
    }
    return (handler as MatcherHandler<typeof matcher.type>).matches(
      matcher as Extract<GuardrailMatcher, { type: typeof matcher.type }>,
      ctx
    )
  }

  /** Remove all registered handlers. */
  clear(): void {
    this.handlers.clear()
  }
}

/**
 * Default (singleton) matcher registry. Call `initializeMatcherRegistry()`
 * to populate it with built-in handlers (bash-command, file-path, predicate).
 */
export const matcherRegistry = new MatcherRegistry()
