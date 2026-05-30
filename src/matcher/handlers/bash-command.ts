import type { MatcherHandler } from '../registry'

export const bashCommandHandler: MatcherHandler<'bash-command'> = {
  type: 'bash-command',
  matches(matcher, ctx) {
    if (ctx.toolName !== 'bash' || !ctx.command) return false
    return matcher.pattern.test(ctx.command)
  },
}
