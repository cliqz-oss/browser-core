import Ember from 'ember';
import DS from 'ember-data';

const Promise = Ember.RSVP.Promise;

function nextId() {
  if(!nextId.id) {
    nextId.id = 1;
  }
  return nextId.id++;
}

export default Ember.Service.extend({
  messageCenter: Ember.inject.service('message-center'),
  notifications: Ember.inject.service('notifications'),

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

      if(message.action === "closeNotification") {
        this.get('messageCenter').remove(message.messageId);
      }
      if(message.action === "addMessage") {
        this.get('messageCenter').addMessages({ [message.message.id]: message.message });
      }

      if(message.action === "newNotification") {
        this.get('notifications').newNotification(message.message.domain, message.message.count);
      }

      if(message.action === "clearNotification") {
        this.get('notifications').clearNotification(message.message.domain);
      }

      if(message.action === "inaccessibleNotification") {
        this.get('notifications').inaccessibleNotification(message.message.domain, message.message.count);
      }

      if(message.action === "accessibleNotification") {
        this.get('notifications').accessibleNotification(message.message.domain, message.message.count, message.message.hasUnread);
      }


      if (message.type === "response") {
        const action = (this.callbacks[message.module] || {})[message.action] || this.callbacks[message.action];
        const requestId = message.requestId;
        if (requestId && action && action[requestId]) {
          action[requestId].call(null, message.response);
          delete action[requestId];
        } else {
          action && action.call(null, message.response);
        }
      }
    });
  },

  getCliqzStatus() {
    let promise = new Promise( resolve => {
      this.callbacks.status = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'status',
      args: [
      ]
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  restart() {
    let promise = new Promise( resolve => {
      this.callbacks.restart = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'restart',
      args: [
      ]
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  disableModule(moduleName) {
    let promise = new Promise( resolve => {
      this.callbacks.disableModule = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'disableModule',
      args: [
        moduleName
      ]
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  enableModule(moduleName) {
    let promise = new Promise( resolve => {
      this.callbacks.enableModule = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'enableModule',
      args: [
        moduleName
      ]
    }), '*');

    return DS.PromiseObject.create({ promise });
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

  dismissMessage(message) {
    let promise = new Promise( resolve => {
      this.callbacks.dismissMessage = resolve;
    })
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'dismissMessage',
      args: [message]
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

  watch(url) {
    const requestId = nextId();

    let promise = new Ember.RSVP.Promise( resolve => {
      this.callbacks.notifications = this.callbacks.notifications || {};
      this.callbacks.notifications.watch = this.callbacks.notifications.watch || {};
      this.callbacks.notifications.watch[requestId] = resolve;
    });

    window.postMessage(JSON.stringify({
      requestId,
      target: "cliqz",
      module: "notifications",
      action: "watch",
      args: [url],
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  refreshNotifications(url) {
     const requestId = nextId();

    let promise = new Ember.RSVP.Promise( resolve => {
     this.callbacks.notifications = this.callbacks.notifications || {};
     this.callbacks.notifications.refreshNotifications = this.callbacks.notifications.refreshNotifications || {};
     this.callbacks.notifications.refreshNotifications[requestId] = resolve;
    });

    window.postMessage(JSON.stringify({
     requestId,
     target: "cliqz",
     module: "notifications",
     action: "refresh",
     args: [url],
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  activateNotification(url) {
    const requestId = nextId();

    let promise = new Ember.RSVP.Promise( resolve => {
     this.callbacks.notifications = this.callbacks.notifications || {};
     this.callbacks.notifications.activateNotification = this.callbacks.notifications.activateNotification || {};
     this.callbacks.notifications.activateNotification[requestId] = resolve;
    });

    window.postMessage(JSON.stringify({
     requestId,
     target: "cliqz",
     module: "notifications",
     action: "activate",
     args: [url],
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  unwatch(url) {
    const requestId = nextId();

    let promise = new Ember.RSVP.Promise( resolve => {
      this.callbacks.notifications = this.callbacks.notifications || {};
      this.callbacks.notifications.unwatch = this.callbacks.notifications.unwatch || {};
      this.callbacks.notifications.unwatch[requestId] = resolve;
    });

    window.postMessage(JSON.stringify({
      requestId,
      target: "cliqz",
      module: "notifications",
      action: "unwatch",
      args: [url],
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  getNotifications(urls = []) {
    const requestId = nextId();

    let promise = new Ember.RSVP.Promise( resolve => {
      this.callbacks.notifications = this.callbacks.notifications || {};
      this.callbacks.notifications.getNotifications = this.callbacks.notifications.getNotifications || {};
      this.callbacks.notifications.getNotifications[requestId] = resolve;
    });
    window.postMessage(JSON.stringify({
      requestId,
      target: "cliqz",
      module: "notifications",
      action: "getNotifications",
      args: [urls],
    }), "*");

    return DS.PromiseObject.create({ promise });
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

  shareLocation(decission = 'no') {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'shareLocation',
      args: [decission]
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

  openFeedbackPage() {
    let promise = new Promise( resolve => {
      this.callbacks.openFeedbackPage = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "core",
      action: "openFeedbackPage"
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
