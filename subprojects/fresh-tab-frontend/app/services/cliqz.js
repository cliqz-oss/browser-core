import Ember from 'ember';
import DS from 'ember-data';

function nextId() {
  if(!nextId.id) {
    nextId.id = 1;
  }
  return nextId.id++;
}

export default Ember.Service.extend({
  init() {
    this._super(...arguments);

    this.callbacks = Object.create(null);

    window.addEventListener("message", ev => {
      let message = {};

      try {
        message = JSON.parse(ev.data);
      } catch (e) {
        // non CLIQZ or invalid message should be ignored
      }

      if (message.type === "response") {
        const action = this.callbacks[message.action];
        const requestId = message.requestId;

        if (requestId) {
          action && action[requestId] && action[requestId].call(null, message.response);
        } else {
          action && action.call(null, message.response);
        }
      }
    });
  },

  redoQuery(query) {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'queryCliqz',
      args: [
        query
      ]
    }), '*');
  },

  selectTabAtIndex(index) {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'history',
      action: 'selectTabAtIndex',
      args: [
        index
      ]
    }), '*');
  },

  openUrl(url) {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'history',
      action: 'openUrl',
      args: [
        url
      ]
    }), '*');
  },

  getQueries() {
    let promise = new Promise( resolve => {
      this.callbacks.getQueries = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'history',
      action: 'getQueries',
      args: [
      ]
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  getQuery(query) {
    let promise = new Promise( resolve => {
      this.callbacks.getQuery = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'history',
      action: 'getQuery',
      args: [
        query
      ]
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  getHistory(params) {
    const requestId = nextId();

    let promise = new Promise( resolve => {
      this.callbacks.getHistory = this.callbacks.getHistory || {};
      this.callbacks.getHistory[requestId] = resolve;
    });

    window.postMessage(JSON.stringify({
      requestId,
      target: 'cliqz',
      module: 'history',
      action: 'getHistory',
      args: [ params ],
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  openNewTab() {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'history',
      action: 'newTab'
    }), '*');
  },

  getConfig() {
    let promise = new Promise( resolve => {
      this.callbacks.getConfig = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'getConfig'
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  takeFullTour() {
    this.callbacks.takeFullTour = () => {};
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'takeFullTour'
    }), '*');
  },

  setUrlbar(value) {
    this.callbacks.getUrlbar = () => {};
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'setUrlbar',
      args: [value]
    }), '*');
  },

  revertBack() {
    this.callbacks.revertBack = () => {};
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'revertBack'
    }), '*');
  },

  getTabIndex() {
    let promise = new Promise( resolve => {
      this.callbacks.getTabIndex = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'getTabIndex'
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  sendTelemetry(msg) {
    this.callbacks.sendTelemetry = () => {};
    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "core",
      action: "sendTelemetry",
      args: [msg]
    }) , "*")
  },

  getSpeedDials() {
    let promise = new Promise( resolve => {
      this.callbacks.getSpeedDials = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      action: "getSpeedDials"
    }) , "*")

    return DS.PromiseObject.create({ promise });
  },

  addSpeedDial(url, index) {
    let promise = new Promise( resolve => {
      this.callbacks.addSpeedDial = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      action: "addSpeedDial",
      "args": [
        url,
        index,
      ]
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  getFeedbackPage() {
    let promise = new Promise( resolve => {
      this.callbacks.getFeedbackPage = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "core",
      action: "getFeedbackPage"
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  revertHistorySpeedDial(item) {

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      "action": "revertHistorySpeedDial",
      "args": [item]
    }), "*");
  },

  removeSpeedDial(item) {
    this.callbacks.removeSpeedDial = () => {};

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      "action": "removeSpeedDial",
      "args": [item]
    }), "*");
  },

  resetAllHistory() {
    let promise = new Promise( resolve => {
      this.callbacks.resetAllHistory = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      "action": "resetAllHistory",
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  getNews() {
    let promise = new Promise( resolve => {
      this.callbacks.getNews = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      action: "getNews"
    }) , "*")

    return DS.PromiseObject.create({ promise });
  }
});
