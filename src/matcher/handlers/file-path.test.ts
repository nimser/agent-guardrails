import { describe, it, expect } from "vitest";
import { filePathHandler } from "./file-path";
import { MAX_MATCH_INPUT_LENGTH } from "../constants";
import type { ToolCallContext } from "../../core/types";

describe("file-path matcher", () => {
  it("returns true when pattern matches filePath", () => {
    const matcher = { type: "file-path" as const, pattern: /\.env$/i };
    const ctx: ToolCallContext = { toolName: "read", filePath: "/home/user/.env" };
    expect(filePathHandler.matches(matcher, ctx)).toBe(true);
  });

  it("returns false when pattern does not match filePath", () => {
    const matcher = { type: "file-path" as const, pattern: /\.env$/i };
    const ctx: ToolCallContext = { toolName: "read", filePath: "/home/user/config.json" };
    expect(filePathHandler.matches(matcher, ctx)).toBe(false);
  });

  it("returns false when filePath is missing", () => {
    const matcher = { type: "file-path" as const, pattern: /test/i };
    const ctx: ToolCallContext = { toolName: "bash", command: "ls" };
    expect(filePathHandler.matches(matcher, ctx)).toBe(false);
  });

  it("works with write tool", () => {
    const matcher = { type: "file-path" as const, pattern: /\.env$/i };
    const ctx: ToolCallContext = { toolName: "write", filePath: "/tmp/.env" };
    expect(filePathHandler.matches(matcher, ctx)).toBe(true);
  });

  it("returns false when filePath exceeds MAX_MATCH_INPUT_LENGTH", () => {
    const matcher = { type: "file-path" as const, pattern: /test/ };
    const ctx: ToolCallContext = {
      toolName: "read",
      filePath: "/" + "a".repeat(MAX_MATCH_INPUT_LENGTH),
    };
    expect(filePathHandler.matches(matcher, ctx)).toBe(false);
  });

  it("still matches when filePath equals MAX_MATCH_INPUT_LENGTH", () => {
    const matcher = { type: "file-path" as const, pattern: /a/ };
    const ctx: ToolCallContext = {
      toolName: "read",
      filePath: "/" + "a".repeat(MAX_MATCH_INPUT_LENGTH - 1),
    };
    expect(filePathHandler.matches(matcher, ctx)).toBe(true);
  });
});
