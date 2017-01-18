
export default class EmptyEnvironment {

  constructor() {
    this.urlChangeListener = undefined;
  }

  onUrlChange(listener) {
    this.urlChangeListener = listener;
  }

  // this should be the url which is OPEN
  emitUrlChange(url) {
    this.urlChangeListener(url);
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
}
