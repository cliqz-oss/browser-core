import logger from '../internals/logger';
import prefs from '../../core/prefs';


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
  generate: () => [
    [
      // Aristotle running tests
      ...parseABTests(prefs.get('abtests_running')),
      // core/ab-tests running tests
      ...parseABTests(prefs.get('ABTests')),
    ],
  ],
  schema: {
    type: 'array',
    items: { type: 'string' },
  },
};
