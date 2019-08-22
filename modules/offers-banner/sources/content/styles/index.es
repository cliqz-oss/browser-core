import * as rewardBox from './reward-box';
import * as browserPanel from './browser-panel';
import * as reminder from './reminder';

const MODULES = {
  'offers-cc': rewardBox,
  'browser-panel': browserPanel,
  'offers-reminder': reminder,
};

export const banner = (type, styles = {}) => (MODULES[type] || browserPanel).banner(styles);
export const wrapper = (type, styles = {}) => (MODULES[type] || browserPanel).wrapper(styles);
export const animate = (type, node, styles = {}) =>
  (MODULES[type] || browserPanel).animate(node, styles);
