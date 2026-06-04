import { describe, expect, it } from "vitest";
import { splitCommands } from "./command-splitter.js";

describe("splitCommands", () => {
  it("splits on semicolon", () => {
    expect(splitCommands("cmd1; cmd2")).toEqual(["cmd1", "cmd2"]);
  });

  it("splits on &&", () => {
    expect(splitCommands("cmd1 && cmd2")).toEqual(["cmd1", "cmd2"]);
  });

  it("splits on ||", () => {
    expect(splitCommands("cmd1 || cmd2")).toEqual(["cmd1", "cmd2"]);
  });

  it("splits on newline", () => {
    expect(splitCommands("cmd1\ncmd2")).toEqual(["cmd1", "cmd2"]);
  });

  it("trims whitespace from commands", () => {
    expect(splitCommands("  cmd1  ;  cmd2  ")).toEqual(["cmd1", "cmd2"]);
  });

  it("filters empty segments", () => {
    expect(splitCommands("cmd1;;cmd2")).toEqual(["cmd1", "cmd2"]);
    expect(splitCommands("cmd1; ;cmd2")).toEqual(["cmd1", "cmd2"]);
  });

  it("does not split inside double quotes", () => {
    expect(splitCommands('echo "hello;world"; cmd2')).toEqual(['echo "hello;world"', "cmd2"]);
  });

  it("does not split inside single quotes", () => {
    expect(splitCommands("echo 'hello&&world'; cmd2")).toEqual(["echo 'hello&&world'", "cmd2"]);
  });

  it("handles mixed separators and quotes", () => {
    expect(splitCommands('cmd1; echo "test;test" && cmd2')).toEqual([
      "cmd1",
      'echo "test;test"',
      "cmd2",
    ]);
  });

  it("returns single command when no separators", () => {
    expect(splitCommands("ls -la")).toEqual(["ls -la"]);
  });

  it("handles empty input", () => {
    expect(splitCommands("")).toEqual([]);
  });

  it("handles whitespace-only input", () => {
    expect(splitCommands("   ")).toEqual([]);
  });

  it("skips line continuation (backslash + newline)", () => {
    // `cat \<newline>.env` → one command: `cat .env`
    const cmd = "cat " + "\\" + "\n" + ".env";
    expect(splitCommands(cmd)).toEqual(["cat .env"]);
  });

  it("skips line continuation with CRLF", () => {
    const cmd = "cat " + "\\" + "\r\n" + ".env";
    expect(splitCommands(cmd)).toEqual(["cat .env"]);
  });

  it("does NOT skip escaped backslash + newline", () => {
    // `cat \\<newline>.env` — double backslash means literal backslash, newline splits
    const cmd = "cat " + "\\\\" + "\n" + ".env";
    expect(splitCommands(cmd)).toEqual(["cat \\\\", ".env"]);
  });

  it("handles multi-line continuation", () => {
    // `cat \<newline>\<newline>.env` → two continuations skipped, spaces preserved
    const cmd = "cat " + "\\" + "\n" + "\\" + "\n" + "  .env";
    expect(splitCommands(cmd)).toEqual(["cat   .env"]);
  });

  it("does NOT apply continuation inside single quotes", () => {
    // Inside single quotes, backslash is literal — the whole string stays
    const cmd = "echo 'cmd1" + "\\" + "\n'; cmd2";
    expect(splitCommands(cmd)).toEqual(["echo 'cmd1\\\n'", "cmd2"]);
  });

  it("consumes trailing backslash at EOF", () => {
    // A lone trailing backslash should be consumed (line continuation with nothing after)
    expect(splitCommands("cmd1 \\")).toEqual(["cmd1"]);
  });

  it("consumes only trailing backslash, not the whole command", () => {
    expect(splitCommands("\\")).toEqual([]);
  });

  it("handles mixed separators across continuations", () => {
    // "cmd1 \<LF> && \<LF> cmd2" → && must still be recognized as separator
    const cmd = "cmd1 " + "\\" + "\n" + " && " + "\\" + "\n" + " cmd2";
    expect(splitCommands(cmd)).toEqual(["cmd1", "cmd2"]);
  });

  it("handles separator continuations with || and semicolons", () => {
    const cmd1 = "cmd1 " + "\\" + "\n" + " || " + "cmd2";
    expect(splitCommands(cmd1)).toEqual(["cmd1", "cmd2"]);

    const cmd2 = "cmd1 " + "\\" + "\n" + " ; " + "cmd2";
    expect(splitCommands(cmd2)).toEqual(["cmd1", "cmd2"]);
  });

  it("applies continuation inside double quotes (bash semantics)", () => {
    // In bash, backslash-newline inside double quotes IS a line continuation
    const cmd = 'echo "hello ' + "\\" + "\n" + 'world"';
    expect(splitCommands(cmd)).toEqual(['echo "hello world"']);
  });

  it("does not split on separators inside continued double-quoted strings", () => {
    const cmd = 'echo "hello ' + "\\" + "\n" + '; world"; cmd2';
    expect(splitCommands(cmd)).toEqual(['echo "hello ; world"', "cmd2"]);
  });
});
