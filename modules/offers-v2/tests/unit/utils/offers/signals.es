class SignalHandlerMock {
  constructor() {
    this.clear();
  }

  destroy() {}

  setCampaignSignal(cid, oid, origID, sid) {
    let cidm = this.db.campaign[cid];
    if (!cidm) {
      cidm = {};
      this.db.campaign[cid] = cidm;
    }
    let oidm = cidm[oid];
    if (!oidm) {
      oidm = {};
      cidm[oid] = oidm;
    }
    let origm = oidm[origID];
    if (!origm) {
      origm = {};
      oidm[origID] = origm;
    }
    if (!origm[sid]) {
      origm[sid] = 1;
    } else {
      origm[sid] += 1;
    }
  }

  setActionSignal(actionID, origID) {
    let origm = this.db.action[origID];
    if (!origm) {
      origm = {};
      this.db.action[origID] = origm;
    }
    if (!origID[actionID]) {
      origID[actionID] = 1; // eslint-disable-line no-param-reassign
    } else {
      origID[actionID] += 1; // eslint-disable-line no-param-reassign
    }
  }

  // helper methods to get some values
  getCampaignSignal(cid, oid, origID, sid) {
    let m = this.db.campaign[cid];
    if (!m) { return null; }
    m = m[oid];
    if (!m) { return null; }
    m = m[origID];
    if (!m) { return null; }
    return m[sid];
  }

  getCampaignSignalsCount() {
    return Object.keys(this.db.campaign).length;
  }

  getActionSignal(actionID, origID) {
    const m = this.db.action[origID];
    if (!m) { return null; }
    return m[actionID];
  }

  getActionSignalCount() {
    return Object.keys(this.db.action).length;
  }

  clear() {
    this.db = {
      campaign: {},
      action: {}
    };
  }

  getAllCampaignSignals() {
    return this.db.campaign;
  }
}

module.exports = {
  'offers-v2/signals/signals_handler': {
    default: SignalHandlerMock,
  },
};
