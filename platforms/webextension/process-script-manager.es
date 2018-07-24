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
          windowTreeInformation: {},
        });
      });
    });

    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (!isCliqzContentScriptMsg(message)) {
        return false;
      }

      const sendResponse = (response) => {
        const r = {
          response,
        };

        respond(r);
      };

      let data = {
        sender,
        sendResponse,
      };
      if (sender.tab) {
        data.windowId = sender.tab.id;
      }

      if (message.payload) {
        data = {
          ...message,
          ...data,
        };
      } else {
        data = {
          payload: message,
          ...data,
        };
      }

      // Dispatch should return true if it is going to send reponse.
      return this.dispatch({ data });
    });
  }

  unload() {
  }

  broadcast(channel, msg) {
    msg = {
      ...msg,
      source: CHROME_MSG_SOURCE
    };

    // TODO: cleanup with process-script.bundle
    let message;
    const { payload, module } = msg;
    if (payload && payload.response) {
      message = { response: payload.response, module };
    } else if (payload) {
      message = { payload, module };
    } else {
      message = msg;
    }

    if (channel === 'cliqz:core') {
      const tabQuery = {};

      if (msg.url) {
        tabQuery.url = msg.url;
      }
      chrome.tabs.query(tabQuery, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, msg));
      });
    } else if (!channel) {
      chrome.runtime.sendMessage(msg);
    } else {
      const windowId = msg.windowId || channel.split('-')[1];
      // Dirty hack, until we clean up all message passing
      if (message.payload && !module) {
        message = message.payload;
      }
      chrome.tabs.sendMessage(Number(windowId), {
        ...message,
        type: Object.prototype.hasOwnProperty.call(message, 'response') ? 'response' : 'request',
      });
    }
  }
}
