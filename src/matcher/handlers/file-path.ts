import { MAX_MATCH_INPUT_LENGTH } from "../constants.js";
import type { MatcherHandler } from "../registry.js";

export const filePathHandler: MatcherHandler<"file-path"> = {
  type: "file-path",
  matches(matcher, ctx) {
    if (!ctx.filePath) return false;
    if (ctx.filePath.length > MAX_MATCH_INPUT_LENGTH) return false;
    return matcher.pattern.test(ctx.filePath);
  },
};
