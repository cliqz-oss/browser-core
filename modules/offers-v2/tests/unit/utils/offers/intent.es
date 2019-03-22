class BackendConnectorMock {
  constructor() {
    this.calls = [];
    this.ret = [];
  }

  setMockResult(ret) {
    this.ret = ret;
  }

  sendApiRequest(endpoint, params, method = 'POST') {
    this.calls.push({ endpoint, params, method });
    const result = typeof this.ret === 'function' ? this.ret(params) : this.ret;
    return Promise.resolve(result);
  }

  isCalled() {
    return this.calls.length;
  }

  getLastCall() {
    if (!this.isCalled()) {
      return null;
    }
    return this.calls[this.calls.length - 1];
  }

  getLastCallEndpoint() {
    return (this.getLastCall() || {}).endpoint;
  }

  getLastCallParams() {
    return (this.getLastCall() || {}).params;
  }

  clear() {
    this.ret = [];
    this.calls = [];
  }
}

// --

class IntentMock {
  constructor(d) {
    this.name = d.name;
    this.active = d.active;
    this.durationSecs = d.durationSecs || 10;
  }

  getName() {
    return this.name;
  }

  isActive() {
    return this.active;
  }

  getDurationSecs() {
    return this.durationSecs;
  }
}

// --

class IntentHandlerMock {
  constructor() {
    this.cb = [];
    this.activeIntents = [];
  }

  registerCallback(cb) { this.cb.push(cb); }

  unregisterCallback() {}

  activateIntentMock(intentData) {
    const intent = new IntentMock(intentData);
    this.activeIntents.push(intent);
    this.cb.forEach(cb => cb('intent-active', intent));
  }

  getActiveIntents() {
    return this.activeIntents;
  }

  getActiveIntent(intentName) {
    let idx = -1;
    for (let i = 0; idx < 0 && i < this.activeIntents.length; i += 1) {
      if (this.activeIntents[i].name === intentName) {
        idx = i;
      }
    }
    return idx < 0 ? null : this.activeIntents[idx];
  }

  isIntentActiveByName(intentName) {
    return this.activeIntents.some(i => i.getName() === intentName);
  }

  isIntentActive(intent) {
    return this.isIntentActiveByName(intent.getName());
  }

  mock_addIntent(name, durSec) { // eslint-disable-line camelcase
    this.activateIntentMock({ name, active: true, durationSecs: durSec });
  }
}

// --

class HistoryMatcherMock {
  constructor(isHistoryEnabled) {
    this.isHistoryEnabled = isHistoryEnabled;
    this.countRetVal = 0;
  }

  hasHistoryEnabled() {
    return true;
  }

  countMatchesWithPartialCheck() {
    return { isPartial: false, count: this.countRetVal };
  }

  countMatches() {
    return Promise.resolve(this.countRetVal);
  }

  setMockCountMatches(v) {
    this.countRetVal = v;
  }
}

// --

class CategoryHandlerMock {
  constructor() {
    this.categoriesAdded = [];
    this.isActive = true;
  }

  addCategory(cat) {
    this.categoriesAdded.push(cat);
  }

  setMockIsCategoryActive(isActive) {
    this.isActive = isActive;
  }

  isCategoryActive() {
    return this.isActive;
  }

  doDailyAccounting() {
  }

  syncCategories(catsIter) {
    for (const cat of catsIter) {
      this.addCategory(cat);
    }
  }

  build() {}
}

// --

module.exports = {
  'offers-v2/backend-connector': {
    default: BackendConnectorMock,
    BackendConnectorMock: BackendConnectorMock,
    IntentHandlerMock: IntentHandlerMock,
    HistoryMatcherMock: HistoryMatcherMock,
    CategoryHandlerMock: CategoryHandlerMock,
  },
};
