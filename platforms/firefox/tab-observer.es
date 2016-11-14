/* global Ci */

class Observer {
  constructor(gBrowser, notifyLocationChange, notifyStateChange) {
    this.notifyLocationChange = notifyLocationChange;
    this.notifyStateChange = notifyStateChange;
    this.gBrowser = gBrowser;
    this.QueryInterface = XPCOMUtils.generateQI([
      'nsIWebProgressListener',
      'nsISupportsWeakReference',
    ]);
    // nsIWebProgressListener state transition flags
    this.wplFlag = {
      STATE_START: Ci.nsIWebProgressListener.STATE_START,
      STATE_IS_DOCUMENT: Ci.nsIWebProgressListener.STATE_IS_DOCUMENT,
    };
  }

  init() {
    this.gBrowser.addTabsProgressListener(this);
  }

  unload() {
    this.gBrowser.removeTabsProgressListener(this);
  }

  // Called by Firefox
  onLocationChange(aBrowser, aProgress, aRequest, aURI, aFlags) {
    const isPrivate = aProgress.usePrivateBrowsing;
    let reqReferrer;

    if (aRequest && aRequest.referrer && aRequest.referrer.asciiSpec) {
      reqReferrer = aRequest.referrer.asciiSpec;
    } else {
      reqReferrer = '';
    }

    this.notifyLocationChange({
      url: aURI && aURI.spec,
      isLoadingDocument: aProgress.isLoadingDocument,
      document: aProgress.document,
      referrer: reqReferrer,
      flags: aFlags,
      isOnPrivateContext: isPrivate,
    });
  }

  // Called by Firefox
  onStateChange(aBrowser, aWebProgress, aRequest, aStateFlag, aStatus) {
    this.notifyStateChange({
      url: aRequest && aRequest.name,
      urlSpec: aRequest && aRequest.URI && aRequest.URI.spec,
      isValid: (aStateFlag & this.wplFlag.STATE_START) && !aStatus,
      isNewPage: (this.wplFlag.STATE_START & aStateFlag) &&
        (this.wplFlag.STATE_IS_DOCUMENT & aStateFlag),
      windowID: aWebProgress.DOMWindowID,
    });
  }
}
export default class {

  constructor(window) {
    this.locationHandlers = [];
    this.stateHandlers = [];
    this.observer = new Observer(
      window.gBrowser,
      (...args) => {
        this.locationHandlers.forEach(handler => handler(...args));
      },
      (...args) => {
        this.stateHandlers.forEach(handler => handler(...args));
      }
    );
  }

  handlersCount() {
    return this.locationHandlers.length + this.stateHandlers.length;
  }

  addEventListener(eventName, handler) {
    if (this.handlersCount() === 0) {
      this.observer.init();
    }

    if (eventName === 'location_change') {
      this.locationHandlers.push(handler);
    }

    if (eventName === 'state_change') {
      this.stateHandlers.push(handler);
    }
  }

  removeEventListener(eventName, handler) {
    if (eventName === 'location_change') {
      let index = this.locationHandlers.indexOf(handler)
      if (index >= 0) {
        this.locationHandlers.splice(index, 1);
      }
    }

    if (eventName === 'state_change') {
      let index = this.stateHandlers.indexOf(handler)
      if (index >= 0) {
        this.stateHandlers.splice(index, 1);
      }
    }

    if (this.handlersCount() === 0) {
      this.observer.unload();
    }
  }

}
