/**
 * Maximum input string length (in characters) that regex-based matchers
 * will attempt to match against. Inputs longer than this are not matched.
 *
 * This bounds worst-case regex evaluation time as a mitigation against
 * community-contributed rule packs that may contain patterns susceptible
 * to catastrophic backtracking. For bash commands and file paths, 4 KB
 * is well above any legitimate input length (PATH_MAX on Linux is 4096;
 * shell commands rarely exceed a few hundred bytes).
 *
 * See docs/adrs/003-matching-strategy.md for the matching-strategy ADR.
 * Stronger alternatives (safe-regex, re2) to replace this heuristic
 * with AST-level guarantees remain a future consideration.
 */
export const MAX_MATCH_INPUT_LENGTH = 4096
