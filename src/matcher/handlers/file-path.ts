import type { MatcherHandler } from '../registry'

export const filePathHandler: MatcherHandler<'file-path'> = {
  type: 'file-path',
  matches(matcher, ctx) {
    if (!ctx.filePath) return false
    return matcher.pattern.test(ctx.filePath)
  },
}
