import { describe, it, expect, beforeEach } from "vitest";
import { MatcherRegistry } from "./registry";
import type { GuardrailMatcher, ToolCallContext } from "../core/types";
import type { MatcherHandler } from "./registry";

describe("MatcherRegistry", () => {
  let registry: MatcherRegistry;

  beforeEach(() => {
    registry = new MatcherRegistry();
  });

  const mockHandler: MatcherHandler = {
    type: "bash-command",
    matches: (matcher, ctx) => {
      if (matcher.type !== "bash-command" || ctx.toolName !== "bash") return false;
      return matcher.pattern.test(ctx.command);
    },
  };

  it("registers handler and evaluate calls it", () => {
    registry.register(mockHandler);
    const matcher: GuardrailMatcher = { type: "bash-command", pattern: /test/i };
    const ctx: ToolCallContext = { toolName: "bash", command: "test command" };
    expect(registry.evaluate(matcher, ctx)).toBe(true);
  });

  it("unknown matcher type throws", () => {
    const matcher: GuardrailMatcher = { type: "bash-command", pattern: /test/i };
    const ctx: ToolCallContext = { toolName: "bash", command: "test" };
    expect(() => registry.evaluate(matcher, ctx)).toThrow();
  });

  it("clear removes all handlers", () => {
    registry.register(mockHandler);
    registry.clear();
    const matcher: GuardrailMatcher = { type: "bash-command", pattern: /test/i };
    const ctx: ToolCallContext = { toolName: "bash", command: "test" };
    expect(() => registry.evaluate(matcher, ctx)).toThrow();
  });

  it("duplicate type registration throws", () => {
    registry.register(mockHandler);
    expect(() => registry.register(mockHandler)).toThrow();
  });
});
