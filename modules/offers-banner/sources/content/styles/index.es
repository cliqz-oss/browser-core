import * as rewardBox from './reward-box';
import * as browserPanel from './browser-panel';

export const banner = (isRewardBox, config) =>
  (isRewardBox ? rewardBox : browserPanel).banner(config);
export const wrapper = isRewardBox => (isRewardBox ? rewardBox : browserPanel).wrapper();
