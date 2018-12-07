import prefs from '../core/prefs';
import inject, { ifModuleEnabled } from '../core/kord/inject';
import background from '../core/base/background';
import Blocker, { BLOCK_MODE } from './blocker';

const DEFAULT_BLOCKLIST = 'default';
const BLOCKLIST_PREF = 'antitrackingBlocklist';
const DEFAULT_ACTION_PREF = 'antitracking.blockMode';
const STEP_NAME = 'blockList';

const CATEGORY_POLICIES_PREF = 'clostery.categoryPolicies';
const COMPANY_POLICIES_PREF = 'clostery.companyPolicies';
const FIRST_PARTY_POLICIES_PREF = 'clostery.firstPartyPolicies';

export default background({

  antitracking: inject.module('antitracking'),

  init() {
    this.blockList = prefs.get(BLOCKLIST_PREF, DEFAULT_BLOCKLIST);

    // policy objects for user-customised control over blocking
    this.categoryPolicies = prefs.getObject(CATEGORY_POLICIES_PREF);
    this.companyPolicies = prefs.getObject(COMPANY_POLICIES_PREF);
    this.firstPartyPolicies = prefs.getObject(FIRST_PARTY_POLICIES_PREF);

    this.blockEngine = new Blocker(this.blockList, prefs.get(DEFAULT_ACTION_PREF),
      this.categoryPolicies, this.companyPolicies, this.firstPartyPolicies);

    return this.blockEngine.init().then(() => {
      const steps = [
        this.antitracking.action('addPipelineStep', 'onBeforeRequest', {
          name: STEP_NAME,
          spec: 'blocking',
          after: ['checkSameGeneralDomain', 'pageLogger.attachStatCounter', 'pageLogger.logRequestMetadata'],
          fn: this.blockEngine.checkBlockRules.bind(this.blockEngine),
        }),
        this.antitracking.action('addPipelineStep', 'onBeforeRequest', {
          name: `${STEP_NAME}Apply`,
          spec: 'blocking',
          before: ['checkShouldBlock'],
          fn: this.blockEngine.applyBlockRules.bind(this.blockEngine),
        })
      ];
      return Promise.all(steps);
    });
  },

  unload() {
    Promise.all([
      ifModuleEnabled(this.antitracking.action('removePipelineStep', 'onBeforeRequest', STEP_NAME)),
      ifModuleEnabled(this.antitracking.action('removePipelineStep', 'onBeforeRequest', `${STEP_NAME}Apply`)),
    ]);

    this.blockEngine.unload();
  },

  events: {
    prefchange: function onPrefChange(pref) {
      if (pref === BLOCKLIST_PREF
        && prefs.get(BLOCKLIST_PREF, DEFAULT_BLOCKLIST) !== this.blockList) {
        // reload with new blocklist
        this.unload();
        this.init();
      }
    }
  },

  _saveFirstPartyPolicies() {
    prefs.setObject(FIRST_PARTY_POLICIES_PREF, this.firstPartyPolicies);
  },

  _setFirstPartyBlockingPolicy(hostname, type, name, policy) {
    const mode = BLOCK_MODE[policy];
    if (!mode) {
      throw new Error(`Unknown policy ${policy}, expected one of: ${Object.keys(BLOCK_MODE)}`);
    }
    const policyTypes = ['company', 'category'];
    if (policyTypes.indexOf(type) === -1) {
      throw new Error(`Unknown policy type ${type}, expected one of: ${policyTypes}`);
    }
    if (!this.firstPartyPolicies[hostname]) {
      this.firstPartyPolicies[hostname] = { company: {}, category: {} };
    }
    this.firstPartyPolicies[hostname][type][name] = policy;
    this._saveFirstPartyPolicies();
  },

  actions: {
    setCategoryBlockingPolicy(category, policy) {
      const mode = BLOCK_MODE[policy];
      if (!mode) {
        throw new Error(`Unknown policy ${policy}, expected one of: ${Object.keys(BLOCK_MODE)}`);
      }
      this.categoryPolicies[category] = mode;
      prefs.setObject(CATEGORY_POLICIES_PREF, this.categoryPolicies);
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
      prefs.setObject(COMPANY_POLICIES_PREF, this.companyPolicies);
    },

    getCompanyBlockingPolicies() {
      return this.companyPolicies;
    },

    setFirstPartyCategoryBlockingPolicy(hostname, category, policy) {
      this._setFirstPartyBlockingPolicy(hostname, 'category', category, policy);
    },

    clearFirstPartyCategoryBlockingPolicies(hostname) {
      if (this.firstPartyPolicies[hostname]) {
        this.firstPartyPolicies[hostname].category = {};
        this._saveFirstPartyPolicies();
      }
    },

    setFirstPartyCompanyBlockingPolicy(hostname, company, policy) {
      this._setFirstPartyBlockingPolicy(hostname, 'company', company, policy);
    },

    clearFirstPartyCompanyBlockingPolicies(hostname) {
      if (this.firstPartyPolicies[hostname]) {
        this.firstPartyPolicies[hostname].company = {};
        this._saveFirstPartyPolicies();
      }
    },

    getFirstPartyBlockingPolicies(hostname) {
      return JSON.parse(JSON.stringify(this.firstPartyPolicies[hostname] || {}));
    },

    queryBlockingPolicy({ category = null, company = null, firstParty = null }) {
      return this.blockEngine._getOverrideAction(firstParty, company, category)
        || this.blockEngine.defaultAction;
    }
  },
});
