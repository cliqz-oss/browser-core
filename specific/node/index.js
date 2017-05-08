var coreBackground = require('./core/background');
var offersBackground = require('./offers-v2/background');
var messageCenterBackground = require('./message-center/background');
var hpnBackground = require('./hpn/background');
var prefs = require('./core/prefs');
var config = require('./core/config');

module.exports = {
  start: function () {
    prefs.set('offers2FeatureEnabled', true);
    prefs.set('offersLogsEnabled', true);
    prefs.set('showConsoleLogs', true);

    return coreBackground.init().then(function () {
      return Promise.all([
        offersBackground.init(),
        messageCenterBackground.init(),
        hpnBackground.init(),
      ]);
    }).then(function (ret) {
      console.log('CLIQZ', 'finished loading', config);
    }).catch(function (e) {
      console.error('CLIQZ', 'Something went wrong', e);
    });
  },

  modules: {
    'core': {
      actions: coreBackground.actions
    },
    'offers-v2': {
      actions: offersBackground.actions
    },
    'message-center': {
      actions: messageCenterBackground.actions
    },
    'hpn': {
      actions: hpn.actions
    }
  }
};
