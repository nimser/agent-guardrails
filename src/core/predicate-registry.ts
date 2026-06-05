import type { ToolCallContext } from "./types";

/** A named function that evaluates whether a tool call matches. */
export type PredicateFunction = (ctx: ToolCallContext) => boolean;

/**
 * Registry for named predicate matchers used by `predicate`-type GuardrailMatchers.
 * Adapters and rule packs register predicates here so YAML configs can reference
 * them by name.
 */
export class PredicateRegistry {
  private readonly predicates = new Map<string, PredicateFunction>();

  /** Register a predicate function under a unique name. */
  register(name: string, fn: PredicateFunction): void {
    if (this.predicates.has(name)) {
      throw new Error(`Predicate "${name}" is already registered`);
    }
    this.predicates.set(name, fn);
  }

  /** Look up a predicate by name. Returns undefined if not found. */
  resolve(name: string): PredicateFunction | undefined {
    return this.predicates.get(name);
  }

  /** Remove all registered predicates. */
  clear(): void {
    this.predicates.clear();
  }
}
