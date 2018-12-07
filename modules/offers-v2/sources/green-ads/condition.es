import moment from '../../platform/lib/moment';

import PatternMatching from '../../platform/lib/adblocker';
import DefaultMap from '../../core/helpers/default-map';

import logger from './logger';


function buildLazyMatch(condition, parent, context) {
  const { map, urlPatterns, queryPatterns } = context;
  const atom = condition.match;

  const result = Object.assign({
    parent,
  }, atom);

  let id;
  if (atom.query !== undefined) {
    const parsed = PatternMatching.parseNetworkFilter(atom.query);
    queryPatterns.push(parsed);
    id = parsed.getId();
    result.query = parsed.getId();
  } else if (atom.url !== undefined) {
    const parsed = PatternMatching.parseNetworkFilter(atom.url);
    urlPatterns.push(parsed);
    id = parsed.getId();
    result.url = parsed.getId();
  }

  map.update(id, (parents) => {
    parents.push(result);
  });

  return result;
}


function buildLazyCondition(condition, parent, context) {
  let result = null;
  let key = null;

  if (condition.and !== undefined) {
    key = 'and';
  } else if (condition.or !== undefined) {
    key = 'or';
  } else if (condition.none !== undefined) {
    key = 'none';
  } else if (condition.seq) {
    key = 'seq';
  } else if (condition.match !== undefined) {
    result = buildLazyMatch(condition, parent, context);
  } else {
    // Operator not supported?
    logger.error('condition not supported', condition);
    return null;
  }

  if (key !== null) {
    result = Object.assign({
      parent,
    }, condition);

    result[key] = condition[key].map(operand =>
      buildLazyCondition(operand, result, context));
  }

  return result;
}


function forEachLeafNodes(condition, cb) {
  if (condition instanceof Array) {
    condition.forEach((node) => {
      forEachLeafNodes(node, cb);
    });
  } else if (condition.url !== undefined || condition.query !== undefined) {
    cb(condition);
  } else if (condition instanceof Object) {
    Object.keys(condition).forEach((key) => {
      if (key !== 'parent') {
        forEachLeafNodes(condition[key], cb);
      }
    });
  }
}


function removeMatchFromMap(match, map) {
  const id = (match.url || match.query);
  const nodes = map.get(id);
  nodes.splice(nodes.indexOf(match), 1);

  if (nodes.length === 0) {
    map.delete(id);
  }
}


function evalMatch(match, { type, ts, target }) {
  const isQuery = match.query !== undefined && type === 'query';
  const isUrl = match.url !== undefined && type === 'url';

  if (isQuery || isUrl) {
    // 1. Check query source constraint
    if (isQuery && match.source !== undefined && target.source !== match.source) {
      return false;
    }

    // 2. Check count constraint
    if (match.min_count !== undefined || match.max_count !== undefined) {
      /* eslint-disable no-param-reassign */
      if (match.count === undefined) {
        match.count = 1;
      } else {
        match.count += 1;
      }
      /* eslint-enable no-param-reassign */

      if (match.count < match.min_count || match.count > match.max_count) {
        return false;
      }
    }

    // 3. Check timestamp constraint
    if (match.seen_in_last_n_days !== undefined) {
      const minTs = moment().subtract(match.seen_in_last_n_days, 'days').startOf('day').valueOf();
      if (ts < minTs) {
        return false;
      }
    }

    return true;
  }

  return false;
}


function shrinkConditionFromLeaf(match, map) {
  // Update parent node knowing that we got a new match
  const parent = match.parent;

  if (parent === null) {
    removeMatchFromMap(match, map);
    return;
  }
  if (parent.and !== undefined) {
    const operands = parent.and;
    const indexOfOperand = operands.indexOf(match);

    // remove the child
    operands.splice(indexOfOperand, 1);
    removeMatchFromMap(match, map);

    // This node is evaluaded to true, so prepare for next step (upward shrinking)
    if (operands.length !== 0) {
      return;
    }
  } else if (parent.or !== undefined) {
    if (parent.min_match !== undefined && parent.min_match !== 1) {
      // The `or` condition has a min_match option, which means we need to match
      // at least N elements under it. We just remove the current match and
      // update the `min_match` clause.
      const operands = parent.or;
      const indexOfOperand = operands.indexOf(match);

      // remove the child
      operands.splice(indexOfOperand, 1);
      removeMatchFromMap(match, map);

      parent.min_match -= 1;

      return;
    }

    // If min_match was not specified (default to 1) or its value was already
    // set to `1`, we consider the `or` condition met, remove all its children
    // and allow shrinking of the condition tree.
    forEachLeafNodes(parent.or, (node) => {
      removeMatchFromMap(node, map);
    });
  } else if (parent.none !== undefined) {
    // It could become true in the future if the condition matched has some
    // time-frame attached (this URL contains this pattern in the last 3 days)
    // So maybe returning `false` is enough.
    return;
  } else if (parent.seq !== undefined) {
    const operands = parent.seq;
    const indexOfOperand = operands.indexOf(match);

    if (indexOfOperand === 0) {
      // remove the child
      operands.splice(indexOfOperand, 1);
      removeMatchFromMap(match, map);

      // This node is evaluaded to true, so prepare
      // for next step (upward shrinking)
      if (operands.length !== 0) {
        return;
      }
    }

    return;
  }

  // Shrink condition tree bottom-up
  shrinkConditionFromLeaf(parent, map);
}


function hasNoneParent(match) {
  let parent = match.parent;

  while (parent !== null && parent.none === undefined) {
    parent = parent.parent;
  }

  return (parent !== null && parent.none !== undefined);
}


export default class Condition {
  constructor(condition) {
    this.reversed = new DefaultMap(() => []);
    this.queryPatterns = [];
    this.urlPatterns = [];
    this.originalCondition = condition;
    this.condition = buildLazyCondition(condition, null, {
      map: this.reversed,
      queryPatterns: this.queryPatterns,
      urlPatterns: this.urlPatterns,
    });

    this.wasMutated = false;
    this.lastEventTs = null;
    this.events = [];
    this.triggered = false;
  }

  dump() {
    return {
      condition: this.originalCondition,
      events: this.events,
      wasMutated: this.wasMutated,
    };
  }

  static load({ condition, events, wasMutated }) {
    const result = new Condition(condition);
    result.match(events);
    result.wasMutated = wasMutated;
    return result;
  }

  whyDidItMatch() {
    return this.events.map((event) => {
      const ago = moment.duration(Date.now() - event.ts).humanize();
      if (event.type === 'query') {
        return `You queried '${event.target.query}' on ${event.target.source} ${ago} ago (pattern: { query: ${event.pattern.filter} })`;
      }
      if (event.type === 'url') {
        return `You visited ${event.target.url} ${ago} ago (pattern: { url: ${event.pattern.filter} })`;
      }

      return '?????';
    });
  }

  match(patternMatchStream) {
    // If the condition has already been triggered, do nothing
    if (this.triggered) {
      return false;
    }

    // If there is no new event, do nothing
    if (patternMatchStream.length === 0) {
      // NOTE: this could be cached and computed only once
      return [...this.reversed.values()].every(nodes => nodes.every(hasNoneParent));
    }

    // Update timestamp of the last event seen
    this.lastEventTs = patternMatchStream[patternMatchStream.length - 1].ts;

    let forceFalse = false;

    for (let i = 0; i < patternMatchStream.length; i += 1) {
      const match = patternMatchStream[i];
      const { pattern } = match;
      const id = pattern.id;

      // logger.log('evaluate event', match);

      if (this.reversed.has(id)) {
        // logger.log('this.reversed has match', match);
        const nodes = this.reversed.get(id);
        for (let j = 0; j < nodes.length; j += 1) {
          const node = nodes[j];
          // logger.log('found node for pattern', node);
          if (evalMatch(node, match)) {
            // logger.log('evalMatch triggered');
            // If this `match` event belongs to a `none` clause, it means that
            // the condition did not match. We still update the condition with
            // other match event, as the `none` clause could become true in the
            // future.
            if (hasNoneParent(node)) {
              // logger.log('hasNoneParent', node);
              forceFalse = true;
              // We need that to make sure that we always get this event in the
              // future. Otherwise we would only get new events and the
              // condition would match (ignoring the `none`)
              this.lastEventTs = match.ts;
            } else {
              // logger.log('!hasNoneParent', node);
              // Mark this campaign as mutated as events has been consumed, hence
              // the condition has been shrinked accordingly. It is used to know
              // when we should refresh the persisted version of the campaign in
              // the database.
              this.wasMutated = true;

              // Add consumed events to the list of matched events. This is used
              // both for debugging and for persisting a campaign on disk. When
              // the campaign is loaded again, the list of matched events is
              // replayed to recreate the last correct state.
              this.events.push(match);

              shrinkConditionFromLeaf(node, this.reversed);
            }
          }
        }
      }
    }

    // logger.log('done evaluating', forceFalse);
    if (forceFalse) {
      return false;
    }

    this.triggered = (
      this.reversed.size === 0
      // NOTE: this could be cached and computed only once
      || [...this.reversed.values()].every(nodes => nodes.every(hasNoneParent))
    );

    return this.triggered;
  }
}
