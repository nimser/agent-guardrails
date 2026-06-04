import { describe, it, expect } from "vitest";
import { bashCommandHandler } from "./bash-command";
import { MAX_MATCH_INPUT_LENGTH } from "../constants";
import type { ToolCallContext } from "../../core/types";

describe("bash-command matcher", () => {
  it("returns true when pattern matches command", () => {
    const matcher = { type: "bash-command" as const, pattern: /sops/i };
    const ctx: ToolCallContext = { toolName: "bash", command: "sops decrypt file.yaml" };
    expect(bashCommandHandler.matches(matcher, ctx)).toBe(true);
  });

  it("returns false when pattern does not match command", () => {
    const matcher = { type: "bash-command" as const, pattern: /sops/i };
    const ctx: ToolCallContext = { toolName: "bash", command: "ls -la" };
    expect(bashCommandHandler.matches(matcher, ctx)).toBe(false);
  });

  it("returns false for non-bash tool", () => {
    const matcher = { type: "bash-command" as const, pattern: /test/i };
    const ctx: ToolCallContext = { toolName: "read", filePath: "/tmp" };
    expect(bashCommandHandler.matches(matcher, ctx)).toBe(false);
  });

  it("returns false when command is missing", () => {
    const matcher = { type: "bash-command" as const, pattern: /test/i };
    const ctx: ToolCallContext = { toolName: "bash" };
    expect(bashCommandHandler.matches(matcher, ctx)).toBe(false);
  });

  it("returns false when command exceeds MAX_MATCH_INPUT_LENGTH", () => {
    const matcher = { type: "bash-command" as const, pattern: /test/ };
    const ctx: ToolCallContext = {
      toolName: "bash",
      command: "a".repeat(MAX_MATCH_INPUT_LENGTH + 1),
    };
    expect(bashCommandHandler.matches(matcher, ctx)).toBe(false);
  });

  it("still matches when command equals MAX_MATCH_INPUT_LENGTH", () => {
    const matcher = { type: "bash-command" as const, pattern: /a/ };
    const ctx: ToolCallContext = {
      toolName: "bash",
      command: "a".repeat(MAX_MATCH_INPUT_LENGTH),
    };
    expect(bashCommandHandler.matches(matcher, ctx)).toBe(true);
  });
});
