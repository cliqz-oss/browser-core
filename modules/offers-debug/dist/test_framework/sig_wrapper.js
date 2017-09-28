class SigWrapper {
  constructor(sigHandler) {
    this.sigListeners = [];
    this.actionListeners = [];
    this.sigHandler = sigHandler;
    this.wrapperSetCampaignSignal = this.wrapperSetCampaignSignal.bind(this);
    this.wrapperSetActionSignal = this.wrapperSetActionSignal.bind(this);
    this.interceptFunction(this.sigHandler, 'setCampaignSignal', this.wrapperSetCampaignSignal);
    this.interceptFunction(this.sigHandler, 'setActionSignal', this.wrapperSetActionSignal);
  }

  interceptFunction(object, fnName, before) {
    var noop = function () {};
    var fnToWrap = object[fnName];

    object[fnName] = function () {
      try {
        before.apply(this, arguments);
      } catch (e) {
        console.log('ERROR catched: ', e);
      }
      var result = fnToWrap.apply(this, arguments);
      return result
    }
  }

  wrapperSetCampaignSignal(cid, oid, origID, sid, counter) {
    console.log('######', 'catched here the signal!' + cid + ' - ' + oid);
    this.sigListeners.forEach((lcb) => {
      lcb(cid, oid, origID, sid, counter);
    });
  }

  wrapperSetActionSignal(actionID, origID, counter) {
    console.log('######', 'catched here the action!' + actionID + ' - ' + origID);
    this.actionListeners.forEach((lcb) => {
      lcb(actionID, origID, counter);
    });
  }

  registerSetCampaignSignal(cb) {
    this.sigListeners.push(cb);
  }
  unregisterSetCampaignSignal(cb) {
    const idx = this.sigListeners.indexOf(cb);
    if (idx >= 0) {
      this.sigListeners.splice(idx,1);
    }
  }

  registerSetActionSignal(cb) {
    this.actionListeners.push(cb);
  }
  unregisterSetActionSignal(cb) {
    const idx = this.actionListeners.indexOf(cb);
    if (idx >= 0) {
      this.actionListeners.splice(idx,1);
    }
  }
}
