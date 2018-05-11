import events from '../core/events';
import { chrome } from './globals';
import { CHROME_MSG_SOURCE, isCliqzContentScriptMsg } from "../core/content/helpers";

export default class {

  constructor(dispatcher) {
    this.dispatch = dispatcher;
  }

  init() {

    chrome.webNavigation.onCommitted.addListener(({ tabId, url, frameId, transitionType }) => {
      // We should only forward main_document URLs for on-location change.

      if (frameId !== 0) {
        return;
      }

      //We need to check if the on-location change happened in a private tab.
      // Modules like human-web should not collect data about sites visited in private tab.
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          return;
        }
        let isPrivate = tab.incognito;
        events.pub('content:location-change', {
          url,
          frameId,
          transitionType,
          isPrivate
        });
      });
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!isCliqzContentScriptMsg(message)) {
        return;
      }

      const windowId = sender.tab.id;
      if (message.payload) {
        this.dispatch({
          data: {
            ...message,
            sender,
            windowId,
          }
        });
      } else {
        this.dispatch({
          data: {
            payload: message,
            sender,
            windowId,
          }
        });
      }
      return true;
    });
  }

  unload() {
  }

  broadcast(channel, msg) {
    msg = {
      ...msg,
      source: CHROME_MSG_SOURCE
    };

    if (channel === 'cliqz:core') {
      if (chrome.windows) {
        chrome.windows.getAll({populate:true}, function(windows){
          windows.forEach(function(window){
            window.tabs.forEach(function(tab){
              chrome.tabs.sendMessage(tab.id, msg);
            });
          });
        });
      } else {
        // on firefox for android there is no chrome.windows
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, msg));
        });
      }
    } else {
      let [_, windowId] = channel.split('-');
      chrome.tabs.sendMessage(Number(windowId), {
        ...msg,
        type: 'response',
      });
    }
  }
}
