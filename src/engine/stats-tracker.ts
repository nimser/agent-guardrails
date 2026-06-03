import type { GuardrailAction } from "../core/types.js";

export interface Stats {
  checks: number;
  blocks: number;
  suggests: number;
}

export class StatsTracker {
  private stats: Stats = { checks: 0, blocks: 0, suggests: 0 };

  /**
   * Record an action result.
   * @param action - The resolved action, or null if no rule matched
   */
  record(action: GuardrailAction | null): void {
    this.stats.checks++;
    if (action?.type === "block") {
      this.stats.blocks++;
    } else if (action?.type === "suggest") {
      this.stats.suggests++;
    }
  }

  /**
   * Get a copy of current stats.
   */
  getStats(): Stats {
    return { ...this.stats };
  }

  /**
   * Reset all stats to zero.
   */
  resetStats(): void {
    this.stats = { checks: 0, blocks: 0, suggests: 0 };
  }
}
