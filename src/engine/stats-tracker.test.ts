import { describe, expect, it, beforeEach } from "vitest";
import { StatsTracker } from "./stats-tracker.js";
import type { GuardrailAction } from "../core/types.js";

describe("StatsTracker", () => {
  let tracker: StatsTracker;

  beforeEach(() => {
    tracker = new StatsTracker();
  });

  it("initial stats are zero", () => {
    const stats = tracker.getStats();
    expect(stats).toEqual({ checks: 0, blocks: 0, suggests: 0 });
  });

  it("record(null) increments checks only", () => {
    tracker.record(null);
    expect(tracker.getStats()).toEqual({ checks: 1, blocks: 0, suggests: 0 });
  });

  it("record(block) increments checks and blocks", () => {
    const action: GuardrailAction = { type: "block", message: "blocked" };
    tracker.record(action);
    expect(tracker.getStats()).toEqual({ checks: 1, blocks: 1, suggests: 0 });
  });

  it("record(suggest) increments checks and suggests", () => {
    const action: GuardrailAction = { type: "suggest", replacement: "safe" };
    tracker.record(action);
    expect(tracker.getStats()).toEqual({ checks: 1, blocks: 0, suggests: 1 });
  });

  it("getStats() returns copy (not reference)", () => {
    const stats1 = tracker.getStats();
    stats1.checks = 99;
    expect(tracker.getStats().checks).toBe(0);
  });

  it("resetStats() zeroes everything", () => {
    tracker.record({ type: "block", message: "x" });
    tracker.record({ type: "suggest", replacement: "y" });
    tracker.record(null);
    tracker.resetStats();
    expect(tracker.getStats()).toEqual({ checks: 0, blocks: 0, suggests: 0 });
  });

  it("accumulate: multiple calls track correctly", () => {
    tracker.record({ type: "block", message: "x" });
    tracker.record(null);
    tracker.record({ type: "suggest", replacement: "y" });
    tracker.record(null);
    tracker.record({ type: "block", message: "z" });
    expect(tracker.getStats()).toEqual({ checks: 5, blocks: 2, suggests: 1 });
  });

  it("record(allow/redact/confirm/run) only increments checks", () => {
    tracker.record({ type: "allow" });
    tracker.record({ type: "redact", replacement: "x" });
    tracker.record({ type: "confirm", message: "ok?" });
    tracker.record({ type: "run", replacement: "safe" });
    expect(tracker.getStats()).toEqual({ checks: 4, blocks: 0, suggests: 0 });
  });
});
