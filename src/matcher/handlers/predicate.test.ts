import { describe, it, expect, beforeEach } from "vitest";
import { createPredicateHandler } from "./predicate";
import { PredicateRegistry } from "../../core/predicate-registry";
import type { ToolCallContext } from "../../core/types";

describe("predicate matcher", () => {
  let predicateRegistry: PredicateRegistry;
  let predicateHandler: ReturnType<typeof createPredicateHandler>;

  beforeEach(() => {
    predicateRegistry = new PredicateRegistry();
    predicateHandler = createPredicateHandler(predicateRegistry);
  });

  it("resolves predicateName and calls function", () => {
    predicateRegistry.register("is-bash", (ctx) => ctx.toolName === "bash");
    const matcher = { type: "predicate" as const, predicateName: "is-bash" };
    const ctx: ToolCallContext = { toolName: "bash", command: "ls" };
    expect(predicateHandler.matches(matcher, ctx)).toBe(true);
  });

  it("returns false when predicate returns false", () => {
    predicateRegistry.register("always-false", () => false);
    const matcher = { type: "predicate" as const, predicateName: "always-false" };
    const ctx: ToolCallContext = { toolName: "bash", command: "ls" };
    expect(predicateHandler.matches(matcher, ctx)).toBe(false);
  });

  it("throws when predicateName is not registered", () => {
    const matcher = { type: "predicate" as const, predicateName: "unknown" };
    const ctx: ToolCallContext = { toolName: "bash", command: "ls" };
    expect(() => predicateHandler.matches(matcher, ctx)).toThrow(
      'Predicate "unknown" is not registered',
    );
  });
});
