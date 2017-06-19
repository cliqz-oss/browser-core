
export default class EmptyEnvironment {

  constructor() {
    this.urlChangeListener = undefined;
  }

  onUrlChange(listener) {
    this.urlChangeListener = listener;
  }

  // this should be the url which is OPEN
  emitUrlChange(url, urlObj) {
    this.urlChangeListener(url, urlObj);
  }

  // activates http request events for specified domains
  watchDomain(domain) {
  }

  queryHistory(start, end) {
    return [];
  }

  sendApiRequest(url) {
    // return promise
  }

  addOffer(offerPayload) {
  }

  addRuleInfoForOffer(offerId, ruleInfo) {
  }

  removeOffer(offerId) {
  }

  hasOffer(offerId) {
    return false;
  }

  offerStatus(offerId, key) {
    return undefined;
  }

  sendSignal(signalId, params) {
  }

  getPref(pref,default_val) {
    return undefined;
  }
}
