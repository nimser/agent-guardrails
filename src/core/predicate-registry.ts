import type { ToolCallContext } from './types'

export type PredicateFunction = (ctx: ToolCallContext) => boolean

export class PredicateRegistry {
  private predicates = new Map<string, PredicateFunction>()

  register(name: string, fn: PredicateFunction): void {
    if (this.predicates.has(name)) {
      throw new Error(`Predicate "${name}" is already registered`)
    }
    this.predicates.set(name, fn)
  }

  resolve(name: string): PredicateFunction | undefined {
    return this.predicates.get(name)
  }

  clear(): void {
    this.predicates.clear()
  }
}
