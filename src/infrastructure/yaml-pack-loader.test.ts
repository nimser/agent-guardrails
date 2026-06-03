import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadYamlRulePack, loadAllRulePacks } from "./yaml-pack-loader.js";
import { PredicateRegistry } from "../core/predicate-registry.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("loadYamlRulePack", () => {
  let testDir: string;
  let predicateRegistry: PredicateRegistry;

  beforeEach(() => {
    testDir = join(tmpdir(), `guardrails-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    predicateRegistry = new PredicateRegistry();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("loads a valid YAML rule pack with bash-command matcher", async () => {
    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(
      yamlPath,
      `id: test-pack\nname: Test Pack\ndescription: A test rule pack\nrules:\n  - id: block-rm\n    title: Block rm command\n    description: Block dangerous rm commands\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: rm -rf\n    defaultAction:\n      type: block\n      message: "Blocked: {matched}"\n`,
    );

    const pack = loadYamlRulePack(yamlPath, predicateRegistry);

    expect(pack.id).toBe("test-pack");
    expect(pack.name).toBe("Test Pack");
    expect(pack.rules).toHaveLength(1);
    expect(pack.rules[0].id).toBe("block-rm");
    expect(pack.rules[0].match.type).toBe("bash-command");
    if (pack.rules[0].match.type === "bash-command") {
      expect(pack.rules[0].match.pattern).toBeInstanceOf(RegExp);
      expect(pack.rules[0].match.pattern.test("rm -rf /")).toBe(true);
    }
  });

  it("loads a YAML rule pack with file-path matcher", async () => {
    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(
      yamlPath,
      `id: file-rules\nname: File Rules\ndescription: File path rules\nrules:\n  - id: protect-env\n    title: Protect .env files\n    description: Block access to .env files\n    phase: before-tool\n    match:\n      type: file-path\n      pattern: "\\\\.env$"\n    defaultAction:\n      type: block\n      message: "Blocked: {matched}"\n`,
    );

    const pack = loadYamlRulePack(yamlPath, predicateRegistry);

    expect(pack.rules[0].match.type).toBe("file-path");
    if (pack.rules[0].match.type === "file-path") {
      expect(pack.rules[0].match.pattern).toBeInstanceOf(RegExp);
      expect(pack.rules[0].match.pattern.test("/home/user/.env")).toBe(true);
    }
  });

  it("loads a YAML rule pack with predicate matcher", async () => {
    predicateRegistry.register("has-private-key", (ctx) => {
      return ctx.toolName === "read" && ctx.filePath?.includes(".ssh") === true;
    });

    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(
      yamlPath,
      `id: ssh-rules\nname: SSH Rules\ndescription: SSH key rules\nrules:\n  - id: protect-ssh-key\n    title: Protect SSH private key\n    description: Block access to SSH private keys\n    phase: before-tool\n    match:\n      type: predicate\n      predicateName: has-private-key\n    defaultAction:\n      type: block\n      message: "Blocked: {matched}"\n`,
    );

    const pack = loadYamlRulePack(yamlPath, predicateRegistry);

    expect(pack.rules[0].match.type).toBe("predicate");
    if (pack.rules[0].match.type === "predicate") {
      expect(pack.rules[0].match.predicateName).toBe("has-private-key");
    }
  });

  it("throws error for unregistered predicate", async () => {
    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(
      yamlPath,
      `id: test-pack\nname: Test Pack\ndescription: Test\nrules:\n  - id: test-rule\n    title: Test\n    description: Test\n    phase: before-tool\n    match:\n      type: predicate\n      predicateName: unknown-predicate\n    defaultAction:\n      type: block\n      message: "Blocked"\n`,
    );

    expect(() => loadYamlRulePack(yamlPath, predicateRegistry)).toThrow(/unknown-predicate/);
  });

  it("throws error for invalid YAML structure", async () => {
    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(yamlPath, "not: valid: yaml: structure: [[[}");

    expect(() => loadYamlRulePack(yamlPath, predicateRegistry)).toThrow();
  });

  it("throws error for missing required fields", async () => {
    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(yamlPath, `id: test-pack\nname: Test Pack\n`);

    expect(() => loadYamlRulePack(yamlPath, predicateRegistry)).toThrow(/description|rules/i);
  });

  it("validates the loaded rule pack", async () => {
    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(
      yamlPath,
      `id: invalid-pack\nname: Invalid Pack\ndescription: Pack with duplicate rule IDs\nrules:\n  - id: dup-rule\n    title: Rule 1\n    description: First\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: test\n    defaultAction:\n      type: block\n      message: "Blocked"\n  - id: dup-rule\n    title: Rule 2\n    description: Second\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: test2\n    defaultAction:\n      type: block\n      message: "Blocked"\n`,
    );

    expect(() => loadYamlRulePack(yamlPath, predicateRegistry)).toThrow(/duplicate/i);
  });

  it("loads multiple rules from a single pack", async () => {
    const yamlPath = join(testDir, "test-rules.yaml");
    writeFileSync(
      yamlPath,
      `id: multi-rules\nname: Multi Rules\ndescription: Multiple rules\nrules:\n  - id: rule-1\n    title: Rule 1\n    description: First\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: cmd1\n    defaultAction:\n      type: block\n      message: "Blocked 1"\n  - id: rule-2\n    title: Rule 2\n    description: Second\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: cmd2\n    defaultAction:\n      type: block\n      message: "Blocked 2"\n`,
    );

    const pack = loadYamlRulePack(yamlPath, predicateRegistry);
    expect(pack.rules).toHaveLength(2);
  });
});

describe("loadAllRulePacks", () => {
  let testDir: string;
  let predicateRegistry: PredicateRegistry;

  beforeEach(() => {
    testDir = join(tmpdir(), `guardrails-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    predicateRegistry = new PredicateRegistry();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("loads all .yaml files from a directory", () => {
    writeFileSync(
      join(testDir, "pack1.yaml"),
      `id: pack1\nname: Pack 1\ndescription: First\nrules:\n  - id: rule-1\n    title: Rule 1\n    description: Test\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: cmd1\n    defaultAction:\n      type: block\n      message: "Blocked"\n`,
    );

    writeFileSync(
      join(testDir, "pack2.yaml"),
      `id: pack2\nname: Pack 2\ndescription: Second\nrules:\n  - id: rule-2\n    title: Rule 2\n    description: Test\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: cmd2\n    defaultAction:\n      type: block\n      message: "Blocked"\n`,
    );

    // Write a non-YAML file (should be ignored)
    writeFileSync(join(testDir, "readme.txt"), "Not a YAML file");

    const packs = loadAllRulePacks(testDir, predicateRegistry);

    expect(packs).toHaveLength(2);
    expect(packs.map((p) => p.id).sort()).toEqual(["pack1", "pack2"]);
  });

  it("returns empty array for empty directory", () => {
    const packs = loadAllRulePacks(testDir, predicateRegistry);
    expect(packs).toHaveLength(0);
  });

  it("throws error if any pack fails validation", () => {
    writeFileSync(
      join(testDir, "valid.yaml"),
      `id: valid\nname: Valid\ndescription: Valid\nrules:\n  - id: rule-1\n    title: Rule 1\n    description: Test\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: cmd\n    defaultAction:\n      type: block\n      message: "Blocked"\n`,
    );

    writeFileSync(
      join(testDir, "invalid.yaml"),
      `id: invalid\nname: Invalid\ndescription: Has duplicate IDs\nrules:\n  - id: dup\n    title: Rule 1\n    description: Test\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: cmd\n    defaultAction:\n      type: block\n      message: "Blocked"\n  - id: dup\n    title: Rule 2\n    description: Test\n    phase: before-tool\n    match:\n      type: bash-command\n      pattern: cmd2\n    defaultAction:\n      type: block\n      message: "Blocked"\n`,
    );

    expect(() => loadAllRulePacks(testDir, predicateRegistry)).toThrow(/duplicate/i);
  });
});
