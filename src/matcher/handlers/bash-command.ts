import { MAX_MATCH_INPUT_LENGTH } from "../constants.js";
import type { MatcherHandler } from "../registry.js";

export const bashCommandHandler: MatcherHandler<"bash-command"> = {
  type: "bash-command",
  matches(matcher, ctx) {
    if (ctx.toolName !== "bash" || !ctx.command) return false;
    if (ctx.command.length > MAX_MATCH_INPUT_LENGTH) return false;
    return matcher.pattern.test(ctx.command);
  },
};
