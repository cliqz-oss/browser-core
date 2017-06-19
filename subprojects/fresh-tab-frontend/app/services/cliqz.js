import Ember from 'ember';
import DS from 'ember-data';
import Spanan from 'npm:spanan';

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
  historySync: Ember.inject.service('history-sync'),

  init() {
    this._super(...arguments);

    const freshtab = new Spanan(({ uuid, functionName, args }) => {
      const message = JSON.stringify({
        target: 'cliqz',
        module: 'freshtab',
        action: functionName,
        requestId: uuid,
        args,
      });
      window.postMessage(message, '*');
    });
    const freshtabProxy = freshtab.createProxy();

    this.getConfig = freshtabProxy.getConfig;
    this.dismissMessage = freshtabProxy.dismissMessage;
    this.getNews = freshtabProxy.getNews;
    this.resetAllHistory = freshtabProxy.resetAllHistory;
    this.removeSpeedDial = freshtabProxy.removeSpeedDial;
    this.revertHistorySpeedDial = freshtabProxy.revertHistorySpeedDial;
    this.addSpeedDial = freshtabProxy.addSpeedDial;
    this.getSpeedDials = freshtabProxy.getSpeedDials;
    this.revertBack = freshtabProxy.revertBack;
    this.getTabIndex = freshtabProxy.getTabIndex;

    const history = new Spanan(({ uuid, functionName, args }) => {
      const message = JSON.stringify({
        target: 'cliqz',
        module: 'history',
        action: functionName,
        requestId: uuid,
        args,
      });
      window.postMessage(message, '*');
    });
    const historyProxy = history.createProxy();

    this.deleteVisit = historyProxy.deleteVisit;
    this.deleteVisits = historyProxy.deleteVisits;
    this.showHistoryDeletionPopup = historyProxy.showHistoryDeletionPopup;

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

      if(message.action === "updateHistoryUrls") {
        this.get('historySync').updateHistoryUrls(message.message.urls);
      }

      if (message.type === "response") {
        const spananMessage = {
          uuid: message.requestId,
          returnedValue: message.response
        };

        if (freshtab.dispatch(spananMessage)) {
          return;
        }

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

  openUrl(url, newTab) {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'history',
      action: 'openUrl',
      args: [
        url,
        newTab
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

  queryCliqz(value) {
    this.callbacks.getUrlbar = () => {};
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'queryCliqz',
      args: [value]
    }), '*');
  },

  getNewsLanguage() {
    let promise = new Promise( (resolve) => {
      this.callbacks.getNewsLanguage = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'getNewsLanguage'
    }), "*");

    return DS.PromiseObject.create({ promise });
  },

  setNewsLanguage(language) {
    let promise = new Promise( resolve => {
      this.callbacks.setNewsLanguage = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      "action": "setNewsLanguage",
      "args": [language]
    }), "*");

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

});
