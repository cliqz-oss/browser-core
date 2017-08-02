
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

  offerStatus(offerId, key) {
    return undefined;
  }

  sendSignal(signalId, params) {
  }

  getPref(pref,default_val) {
    return undefined;
  }
}
