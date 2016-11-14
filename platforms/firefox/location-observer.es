class Observer {

  constructor(gBrowser, notify) {
    this.gBrowser = gBrowser;
    this.notify = notify;

    this.QueryInterface = XPCOMUtils.generateQI([
      'nsIWebProgressListener',
      'nsISupportsWeakReference',
    ]);
  }

  init() {
    this.gBrowser.addProgressListener(this);
  }

  unload() {
    this.gBrowser.removeProgressListener(this);
  }

  onLocationChange(aBrowser, aRequest, aURI) {
    setTimeout(() => {
      this.notify(aURI.spec, aBrowser.usePrivateBrowsing);
    }, 0);
  }
}

export default class {

  constructor(window) {
    this.handlers = [];
    this.observer = new Observer(window.gBrowser, (url, isPrivate) => {
      this.handlers.forEach(handler => handler(url, isPrivate));
    });
  }

  addEventListener(eventName, handler) {
    if (this.handlers.length === 0) {
      this.observer.init();
    }
    this.handlers.push(handler);
  }

  removeEventListener(eventName, handler) {
    const index = this.handlers.indexOf(handler);
    if (index >= 0) {
      this.handlers.splice(index, 1);
    }

    if (this.handlers.length === 0) {
      this.observer.unload();
    }
  }
}
