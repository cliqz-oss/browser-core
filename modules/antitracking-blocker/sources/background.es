import utils from '../core/utils';
import inject from '../core/kord/inject';
import background from '../core/base/background';
import Blocker, { BLOCK_MODE } from './blocker';

const DEFAULT_BLOCKLIST = 'default';
const BLOCKLIST_PREF = 'antitrackingBlocklist';
const DEFAULT_ACTION_PREF = 'antitracking.blockMode';
const STEP_NAME = 'blockList';

const CATEGORY_POLICIES_PREF = 'clostery.categoryPolicies';
const COMPANY_POLICIES_PREF = 'clostery.companyPolicies';

export default background({

  antitracking: inject.module('antitracking'),

  init() {
    this.blockList = utils.getPref(BLOCKLIST_PREF, DEFAULT_BLOCKLIST);

    // policy objects for user-customised control over blocking
    this.categoryPolicies = JSON.parse(utils.getPref(CATEGORY_POLICIES_PREF, '{}'));
    this.companyPolicies = JSON.parse(utils.getPref(COMPANY_POLICIES_PREF, '{}'));

    this.blockEngine = new Blocker(this.blockList, utils.getPref(DEFAULT_ACTION_PREF),
      this.categoryPolicies, this.companyPolicies);

    return this.blockEngine.init().then(() => {
      const steps = [
        this.antitracking.action('addPipelineStep', {
          name: STEP_NAME,
          stages: ['open'],
          after: ['determineContext', 'checkSameGeneralDomain', 'attachStatCounter', 'logRequestMetadata'],
          fn: this.blockEngine.checkBlockRules.bind(this.blockEngine),
        }),
        this.antitracking.action('addPipelineStep', {
          name: `${STEP_NAME}Apply`,
          stages: ['open'],
          before: ['checkShouldBlock'],
          fn: this.blockEngine.applyBlockRules.bind(this.blockEngine),
        })
      ];
      return Promise.all(steps);
    });
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
  },

  actions: {
    setCategoryBlockingPolicy(category, policy) {
      const mode = BLOCK_MODE[policy];
      if (!mode) {
        throw new Error(`Unknown policy ${policy}, expected one of: ${Object.keys(BLOCK_MODE)}`);
      }
      this.categoryPolicies[category] = mode;
      utils.setPref(CATEGORY_POLICIES_PREF, JSON.stringify(this.categoryPolicies));
    },

    getCategoryBlockingPolicies() {
      return this.categoryPolicies;
    },

    setCompanyBlockingPolicy(company, policy) {
      const mode = BLOCK_MODE[policy];
      if (!mode) {
        throw new Error(`Unknown policy ${policy}, expected one of: ${Object.keys(BLOCK_MODE)}`);
      }
      this.companyPolicies[company] = mode;
      utils.setPref(COMPANY_POLICIES_PREF, JSON.stringify(this.companyPolicies));
    },

    getCompanyBlockingPolicies() {
      return this.companyPolicies;
    },
  },
});
