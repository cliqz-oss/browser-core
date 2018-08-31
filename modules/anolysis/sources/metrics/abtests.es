import inject from '../../core/kord/inject';
import logger from '../internals/logger';
import prefs from '../../core/prefs';
import { actionFallback } from '../analyses-utils';


const getValues = o => Object.keys(o).map(k => o[k]);

function parseABTests(abtests) {
  if (typeof abtests !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(abtests);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return Object.keys(parsed);
  } catch (ex) {
    logger.error('while parsing abtests', ex);
  }

  return [];
}


/** This metric will be called once a day to register the current ABTests a user
 * belongs to. This information can then be used by other analyses to analyze
 * the behavior of different ABTest groups.
 */
export default {
  name: 'metrics.core.abtests',
  offsets: [0],
  generate: async () => [
    [
      // Aristotle running tests
      ...getValues(await inject.module('abtests').action('getRunningTests').catch(actionFallback({}))),
      // core/ab-tests running tests
      ...parseABTests(prefs.get('ABTests')).map(id => ({ id })),
    ],
  ],
  schema: {
    type: 'array',
    items: { type: 'string' },
  },
};
