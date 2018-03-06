/* eslint no-param-reassign: 'off' */

import events from '../core/events';
import { chrome } from './globals';
import { CHROME_MSG_SOURCE, isCliqzContentScriptMsg } from '../core/content/helpers';

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
          transitionType,
          isPrivate,
          windowId: tabId,
        });
      });
    });

    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (!isCliqzContentScriptMsg(message)) {
        return;
      }

      const sendResponse = (response) => {
        const r = {
          response,
        };

        respond(r);
      };

      const windowId = sender.tab.id;
      if (message.payload) {
        this.dispatch({
          data: {
            ...message,
            sender,
            windowId,
            sendResponse,
          }
        });
      } else {
        this.dispatch({
          data: {
            payload: message,
            sender,
            windowId,
            sendResponse,
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
      const tabQuery = {};

      if (msg.url) {
        tabQuery.url = msg.url;
      }
      chrome.tabs.query(tabQuery, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, msg));
      });
    } else {
      const windowId = channel.split('-')[1];
      chrome.tabs.sendMessage(Number(windowId), {
        ...msg,
        type: 'response',
      });
    }
  }
}
