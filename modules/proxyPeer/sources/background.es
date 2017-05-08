import background from '../core/base/background';
import inject from '../core/kord/inject';
import TrackerProxy from './tracker-proxy';

export default background({
  antitracking: inject.module('antitracking'),

  init(/* settings */) {
    this.trackerProxy = new TrackerProxy(this.antitracking);
    return this.trackerProxy.init();
  },
  unload() {
    this.trackerProxy.unload();
  },
});
