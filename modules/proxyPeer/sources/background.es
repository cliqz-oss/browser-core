import background from '../core/base/background';
import inject from '../core/kord/inject';
import TrackerProxy from './tracker-proxy';

export default background({
  antitracking: inject.module('antitracking'),
  webRequestPipeline: inject.module('webrequest-pipeline'),
  p2p: inject.module('p2p'),

  init(/* settings */) {
    this.trackerProxy = new TrackerProxy(
      this.antitracking,
      this.webRequestPipeline,
      this.p2p
    );
    return this.trackerProxy.init();
  },

  unload() {
    this.trackerProxy.unload();
  },
});
