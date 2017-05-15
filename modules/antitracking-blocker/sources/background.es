import utils from '../core/utils';
import inject from '../core/kord/inject';
import background from '../core/base/background';
import Blocker from './blocker';

const DEFAULT_BLOCKLIST = 'default';
const BLOCKLIST_PREF = 'antitrackingBlocklist';
const STEP_NAME = 'blockList';

export default background({

  antitracking: inject.module('antitracking'),

  init() {
    this.blockList = utils.getPref(BLOCKLIST_PREF, DEFAULT_BLOCKLIST);
    this.blockEngine = new Blocker(this.blockList);
    return this.blockEngine.init().then(
      () => this.antitracking.action('addPipelineStep', {
        name: STEP_NAME,
        stages: ['open'],
        after: ['determineContext', 'checkSameGeneralDomain', 'attachStatCounter', 'logRequestMetadata'],
        fn: this.blockEngine.checkBlockRules.bind(this.blockEngine),
      })
    );
  },

  unload() {
    this.antitracking.action('removePipelineStep', STEP_NAME);
    this.blockEngine.unload();
  },

  events: {
    prefchange: function onPrefChange(pref) {
      if (pref === BLOCKLIST_PREF &&
        utils.getPref(BLOCKLIST_PREF, DEFAULT_BLOCKLIST) !== this.blockList) {
        // reload with new blocklist
        this.unload();
        this.init();
      }
    }
  }
});
