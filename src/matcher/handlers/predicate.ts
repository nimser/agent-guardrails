import type { MatcherHandler } from '../registry';
import type { ToolCallContext } from '../../core/types';
import { PredicateRegistry } from '../../core/predicate-registry';

export function createPredicateHandler(predicateRegistry: PredicateRegistry): MatcherHandler<'predicate'> {
  return {
    type: 'predicate',
    matches(matcher, ctx) {
      const fn = predicateRegistry.resolve(matcher.predicateName);
      if (!fn) {
        throw new Error(`Predicate "${matcher.predicateName}" is not registered`);
      }
      return fn(ctx);
    },
  };
}
