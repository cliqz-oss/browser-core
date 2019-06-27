/* eslint no-param-reassign: 'off' */

import events from '../core/events';
import { chrome, isContentScriptsSupported } from './globals';
import { equals as urlEquals } from '../core/url';
import { setTimeout } from '../core/timers';

const cliqzConfigScript = `
function cliqzConfigScript(cliqz) {
  window.CLIQZ = cliqz;
  if (window.runCliqz) {
    window.runCliqz(window.CLIQZ);
  }
}`;

function supressLastError() {
  if (chrome.runtime.lastError) {
    // do nothing
  }
}

function generateContentScript(cliqz) {
  return `(${cliqzConfigScript})(${JSON.stringify(cliqz)});`;
}

function createCliqzObject(app) {
  const cliqz = {
    app: app.status(),
  };
  return cliqz;
}

class FirefoxInjection {
  static isSupported() {
    return isContentScriptsSupported();
  }

  init() {
    this._init = Promise.resolve();
  }

  setCliqzGlobal(cliqz) {
    this._init = this._init.then(() => {
      this.unload();
      return chrome.contentScripts.register({
        allFrames: true,
        js: [{
          code: generateContentScript(cliqz),
        }],
        runAt: 'document_start',
        matches: [
          'http://*/*',
          'https://*/*'
        ],
      });
    }).then((script) => {
      this.scriptRegistration = script;
    });
  }

  unload() {
    if (this.scriptRegistration) {
      // unregister previous script
      this.scriptRegistration.unregister();
      this.scriptRegistration = null;
    }
  }
}

class ChromeInjection {
  constructor() {
    this.code = '';
    this._frameListener = this.onFrameRequest.bind(this);
  }

  init() {
    chrome.webRequest.onCompleted.addListener(this._frameListener, {
      urls: ['http://*/*', 'https://*/*'],
      types: ['main_frame', 'sub_frame'],
    });
  }

  unload() {
    chrome.webRequest.onCompleted.removeListener(this._frameListener);
  }

  setCliqzGlobal(cliqz) {
    this.code = generateContentScript(cliqz);
  }

  onFrameRequest(details) {
    // attempt to call executeScript on the new frame
    // this will fail until the frame exists, so retry until it succeeds.
    let attemptCounter = 10;
    const injectFrameScript = () => {
      if (attemptCounter === 0) {
        return;
      }
      attemptCounter -= 1;
      chrome.tabs.executeScript(details.tabId, {
        code: this.code,
        frameId: details.frameId,
        runAt: 'document_start',
      }, () => {
        if (chrome.runtime.lastError) {
          setTimeout(injectFrameScript, 2);
        }
      });
    };
    injectFrameScript();
  }
}

export default class ProcessScriptManager {
  constructor(dispatcher) {
    this.dispatch = dispatcher;
    this.scriptInjector = isContentScriptsSupported() ? new FirefoxInjection()
      : new ChromeInjection();
    this.appReady = false;
  }

  init(app) {
    function onLocationChangeHandler({ tabId, url, frameId, transitionType }) {
      // We should only forward main_document URLs for on-location change.

      if (frameId !== 0) {
        return;
      }

      // We need to check if the on-location change happened in a private tab.
      // Modules like human-web should not collect data about sites visited in private tab.
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          return;
        }
        const isPrivate = tab.incognito;
        events.pub('content:location-change', {
          url,
          frameId,
          tabId,
          transitionType,
          isPrivate,
          windowId: tabId,
          windowTreeInformation: { tabId }
        });
      });
    }
    chrome.webNavigation.onCommitted.addListener(onLocationChangeHandler);
    chrome.webNavigation.onHistoryStateUpdated.addListener(onLocationChangeHandler);

    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      const sendResponse = (response) => {
        const r = {
          response,
          requestId: message.requestId,
        };

        respond(r);
      };

      // Dispatch should return true if it is going to send reponse.
      return this.dispatch(message, sender, sendResponse);
    });

    this.scriptInjector.init();
    app.ready().then(() => {
      this.appReady = true;
      this.shareAppState(app);
    });
  }

  unload() {
    this.scriptInjector.unload();
  }

  broadcast(channel, msg) {
    if (channel === 'cliqz:core') {
      chrome.tabs.query({}, (_tabs) => {
        const tabs = _tabs.filter(tab => urlEquals(tab.url, msg.url));
        tabs.forEach((tab) => {
          try {
            chrome.tabs.sendMessage(tab.id, msg, supressLastError);
          } catch (e) {
            // error on one tab should not prevent sending to other ones
          }
        });
      });
    } else if (!channel) {
      chrome.runtime.sendMessage(msg, supressLastError);
    } else {
      const windowId = msg.windowId || channel.split('-')[1];
      chrome.tabs.sendMessage(Number(windowId), msg, supressLastError);
    }
  }

  shareAppState(app) {
    if (!this.appReady) {
      return;
    }
    this.scriptInjector.setCliqzGlobal(createCliqzObject(app));
  }
}
