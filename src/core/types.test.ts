import { describe, it, expect } from "vitest";
import type {
  GuardrailBehavior,
  GuardrailAction,
  ToolCallContext,
  GuardrailMatcher,
  GuardrailRule,
  RulePack,
} from "./types";

describe("GuardrailBehavior", () => {
  it("should be a union of the five expected strings", () => {
    // Compile-time: assignability checks
    const block: GuardrailBehavior = "block";
    const suggest: GuardrailBehavior = "suggest";
    const run: GuardrailBehavior = "run";
    const redact: GuardrailBehavior = "redact";
    const confirm: GuardrailBehavior = "confirm";

    // Runtime: values are as expected
    expect([block, suggest, run, redact, confirm]).toEqual([
      "block",
      "suggest",
      "run",
      "redact",
      "confirm",
    ]);
  });
});

describe("GuardrailAction", () => {
  it("supports allow action", () => {
    const action: GuardrailAction = { type: "allow" };
    expect(action.type).toBe("allow");
  });

  it("supports block action with message", () => {
    const action: GuardrailAction = { type: "block", message: "Blocked: {matched}" };
    expect(action.type).toBe("block");
    if (action.type === "block") {
      expect(action.message).toBe("Blocked: {matched}");
    }
  });

  it("supports suggest action with replacement and optional message", () => {
    const action: GuardrailAction = {
      type: "suggest",
      replacement: "safe-command",
      message: "Use safer alternative instead of {matched}",
    };
    expect(action.type).toBe("suggest");
    if (action.type === "suggest") {
      expect(action.replacement).toBe("safe-command");
      expect(action.message).toBeDefined();
    }
  });

  it("supports run action with replacement and optional message", () => {
    const action: GuardrailAction = {
      type: "run",
      replacement: "safe-command",
      message: "Running safe alternative",
    };
    expect(action.type).toBe("run");
    if (action.type === "run") {
      expect(action.replacement).toBe("safe-command");
    }
  });

  it("supports redact action with replacement", () => {
    const action: GuardrailAction = { type: "redact", replacement: "[REDACTED]" };
    expect(action.type).toBe("redact");
    if (action.type === "redact") {
      expect(action.replacement).toBe("[REDACTED]");
    }
  });

  it("supports confirm action with message and optional fallback", () => {
    const action: GuardrailAction = {
      type: "confirm",
      message: "Are you sure about {matched}?",
      fallback: { type: "block", message: "User declined" },
    };
    expect(action.type).toBe("confirm");
    if (action.type === "confirm") {
      expect(action.message).toBe("Are you sure about {matched}?");
      expect(action.fallback).toEqual({ type: "block", message: "User declined" });
    }
  });
});

describe("ToolCallContext", () => {
  it("supports bash tool with command", () => {
    const ctx: ToolCallContext = { toolName: "bash", command: "ls -la" };
    expect(ctx.toolName).toBe("bash");
    if (ctx.toolName === "bash") {
      expect(ctx.command).toBe("ls -la");
    }
  });

  it("supports bash tool with command and optional filePath", () => {
    const ctx: ToolCallContext = { toolName: "bash", command: "cat file.txt", filePath: "/tmp" };
    expect(ctx.toolName).toBe("bash");
    if (ctx.toolName === "bash") {
      expect(ctx.command).toBe("cat file.txt");
      expect(ctx.filePath).toBe("/tmp");
    }
  });

  it("supports read tool with filePath", () => {
    const ctx: ToolCallContext = { toolName: "read", filePath: "/home/user/file.txt" };
    expect(ctx.toolName).toBe("read");
  });

  it("supports write tool with filePath", () => {
    const ctx: ToolCallContext = { toolName: "write", filePath: "/home/user/file.txt" };
    expect(ctx.toolName).toBe("write");
  });

  it("supports catch-all for unknown tools", () => {
    const ctx: ToolCallContext = { toolName: "custom-tool" };
    expect(ctx.toolName).toBe("custom-tool");
  });
});

describe("GuardrailMatcher", () => {
  it("supports bash-command matcher with pattern", () => {
    const matcher: GuardrailMatcher = { type: "bash-command", pattern: /sops/i };
    expect(matcher.type).toBe("bash-command");
    if (matcher.type === "bash-command") {
      expect(matcher.pattern.test("sops decrypt file")).toBe(true);
    }
  });

  it("supports file-path matcher with pattern", () => {
    const matcher: GuardrailMatcher = { type: "file-path", pattern: /\.env$/i };
    expect(matcher.type).toBe("file-path");
    if (matcher.type === "file-path") {
      expect(matcher.pattern.test("/home/user/.env")).toBe(true);
    }
  });

  it("supports predicate matcher with predicateName", () => {
    const matcher: GuardrailMatcher = { type: "predicate", predicateName: "ssh-private-key" };
    expect(matcher.type).toBe("predicate");
    if (matcher.type === "predicate") {
      expect(matcher.predicateName).toBe("ssh-private-key");
    }
  });
});

describe("GuardrailRule", () => {
  it("has required fields", () => {
    const rule: GuardrailRule = {
      id: "test.rule",
      title: "Test Rule",
      description: "A test rule",
      phase: "before-tool",
      match: { type: "bash-command", pattern: /test/i },
      defaultAction: { type: "block", message: "Blocked: {matched}" },
    };
    expect(rule.id).toBe("test.rule");
    expect(rule.title).toBe("Test Rule");
    expect(rule.description).toBe("A test rule");
    expect(rule.phase).toBe("before-tool");
    expect(rule.match.type).toBe("bash-command");
    expect(rule.defaultAction.type).toBe("block");
  });

  it("supports after-tool phase", () => {
    const rule: GuardrailRule = {
      id: "test.after",
      title: "After Tool",
      description: "Runs after tool",
      phase: "after-tool",
      match: { type: "bash-command", pattern: /test/i },
      defaultAction: { type: "redact", replacement: "[REDACTED]" },
    };
    expect(rule.phase).toBe("after-tool");
  });
});

describe("RulePack", () => {
  it("has required fields", () => {
    const pack: RulePack = {
      id: "test-pack",
      name: "Test Pack",
      description: "A test rule pack",
      rules: [
        {
          id: "test.rule1",
          title: "Rule 1",
          description: "First rule",
          phase: "before-tool",
          match: { type: "bash-command", pattern: /rule1/i },
          defaultAction: { type: "block", message: "Blocked" },
        },
      ],
    };
    expect(pack.id).toBe("test-pack");
    expect(pack.name).toBe("Test Pack");
    expect(pack.description).toBe("A test rule pack");
    expect(pack.rules).toHaveLength(1);
  });

  it("supports multiple rules", () => {
    const pack: RulePack = {
      id: "multi-pack",
      name: "Multi Pack",
      description: "Multiple rules",
      rules: [
        {
          id: "rule1",
          title: "Rule 1",
          description: "First",
          phase: "before-tool",
          match: { type: "bash-command", pattern: /a/i },
          defaultAction: { type: "block", message: "Blocked" },
        },
        {
          id: "rule2",
          title: "Rule 2",
          description: "Second",
          phase: "before-tool",
          match: { type: "file-path", pattern: /\.env$/i },
          defaultAction: { type: "suggest", replacement: "safe" },
        },
      ],
    };
    expect(pack.rules).toHaveLength(2);
  });
});
