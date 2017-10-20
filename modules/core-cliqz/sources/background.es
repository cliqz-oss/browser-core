import background from '../core/base/background';
import utils from '../core/utils';
import { isFirefox, isMobile } from '../core/platform';
import language from "../core/language";
import prefs from '../core/prefs';
import HistoryManager from '../core/history-manager';
import inject from '../core/kord/inject';
import config from "../core/config";
import Storage from '../core/storage';

export default background({
  init(settings = {}) {
    this.settings = settings;
    utils.bindObjectFunctions(this.actions, this);

    // load translations
    utils.getLocalizedString('test');

    utils.init();

    this.checkSession();
    if(isFirefox){
      language.init();
      HistoryManager.init();
    }

    if (!isMobile) {
      this.report = utils.setTimeout(this.reportStartupTime.bind(this), 1000 * 60);
    }

    this.supportInfo = utils.setTimeout(() => {
        this.actions.setSupportInfo();
        if(config.settings.channel == 40){
          this.browserDetection();
        }
      }, 30 * 1000);
  },

  unload() {
    utils.clearTimeout(this.report);
    utils.clearTimeout(this.supportInfo);
    if (isFirefox) {
      language.unload();
      HistoryManager.unload();
    }
  },

  reportStartupTime() {
    inject.module('core').action(
      'status'
    ).then((status) => {
      utils.telemetry({
        type: 'startup',
        modules: status.modules,
      });
    });
  },

  checkSession() {
    if (!prefs.has('session')) {
      const session = [
        utils.rand(18),
        utils.rand(6, '0123456789'),
        '|',
        utils.getDay(),
        '|',
        config.settings.channel || 'NONE',
      ].join('');

      prefs.set('session', session);
      prefs.set('install_date', session.split('|')[1]);
      prefs.set('new_session', true);
    } else {
      prefs.set('new_session', false);
    }
  },

  browserDetection() {
    var pref = 'detection',
        sites = ["https://www.ghostery.com", "https://ghostery.com"];

    // make sure we only do it once
    if(utils.getPref(pref, false) !== true){
      utils.setPref(pref, true);

      sites.forEach(function(url){
          var ls = new Storage(url)
          if (ls) ls.setItem("cliqz", true)
      });
    }
  },

  actions: {
    setSupportInfo(status) {

      const version = this.settings.version;
      const host = prefs.get('distribution.id', '', '');
      const hostVersion = prefs.get('distribution.version', '', '');
      const info = JSON.stringify({
        version,
        host,
        hostVersion,
        country: utils.getPref('config_location', ''),
        status: status || 'active',
      });


      try {
        ['http://cliqz.com', 'https://cliqz.com'].forEach(url => {
          const ls = new Storage(url);
          ls.setItem('extension-info', info);
        });
      } catch(e) {
        console.log('Error setting localstorage', e);
      }
    }
  }

});
