import * as rewardBox from './reward-box';
import * as browserPanel from './browser-panel';
import logger from '../logger';

/*
 *  We can think about `transform` and `transformMany` just
 *  like `map` between offer model and `view` in real estate.
 *  Every iframe needs a special format for rendering real estate,
 *  but offers-v2 provide general way of representation for offer model.
 *  This library provides wrapper around offers model.
*/

export function transform(type, data, options = {}) {
  const mapper = {
    'offers-cc': rewardBox.transform,
    'browser-panel': browserPanel.transform,
  };
  if (!mapper[type]) { logger.warn('receive wrong type of real estate: ', type); }
  const noop = () => {};
  return (mapper[type] || noop)(data, options);
}

export function transformMany(type, data) {
  const mapper = {
    'offers-cc': rewardBox.transformMany,
  };
  if (!mapper[type]) { logger.warn('receive wrong type of real estate: ', type); }
  const noop = () => {};
  return (mapper[type] || noop)(data);
}
