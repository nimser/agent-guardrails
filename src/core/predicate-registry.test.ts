import { describe, it, expect, beforeEach } from "vitest";
import { PredicateRegistry } from "./predicate-registry";
import type { ToolCallContext } from "./types";

describe("PredicateRegistry", () => {
  let registry: PredicateRegistry;

  beforeEach(() => {
    registry = new PredicateRegistry();
  });

  it("registers a predicate and resolves it by name", () => {
    const predicate = (ctx: ToolCallContext) => ctx.toolName === "bash";
    registry.register("is-bash", predicate);

    const resolved = registry.resolve("is-bash");
    expect(resolved).toBeDefined();
    expect(resolved!({ toolName: "bash", command: "ls" })).toBe(true);
    expect(resolved!({ toolName: "read", filePath: "/tmp" })).toBe(false);
  });

  it("returns undefined for unknown predicate name", () => {
    const resolved = registry.resolve("unknown");
    expect(resolved).toBeUndefined();
  });

  it("clear() removes all registered predicates", () => {
    registry.register("p1", () => true);
    registry.register("p2", () => false);
    registry.clear();

    expect(registry.resolve("p1")).toBeUndefined();
    expect(registry.resolve("p2")).toBeUndefined();
  });

  it("duplicate registration throws", () => {
    registry.register("test", () => true);
    expect(() => registry.register("test", () => false)).toThrow();
  });
});
