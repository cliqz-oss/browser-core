import background from '../core/base/background';
import utils from '../core/utils';
import { isFirefox, isMobile } from '../core/platform';
import language from '../core/language';
import prefs from '../core/prefs';
import HistoryManager from '../core/history-manager';
import inject from '../core/kord/inject';
import config from '../core/config';
import Storage from '../core/storage';
import console from '../core/console';
import { getMessage } from '../core/i18n';
import bindObjectFunctions from '../core/helpers/bind-functions';

export default background({
  requiresServices: ['utils', 'session'],

  init(settings = {}) {
    this.settings = settings;
    bindObjectFunctions(this.actions, this);

    // load translations
    getMessage('test');

    if (isFirefox) {
      language.init();
      HistoryManager.init();
    }

    if (!isMobile) {
      this.report = setTimeout(this.reportStartupTime.bind(this), 1000 * 60);
    }

    this.supportInfo = setTimeout(() => {
      this.actions.setSupportInfo();
      if (config.settings.channel === 40) {
        this.browserDetection();
      }
    }, 30 * 1000);
  },

  unload() {
    clearTimeout(this.report);
    clearTimeout(this.supportInfo);
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

  browserDetection() {
    const sites = ['https://www.ghostery.com', 'https://ghostery.com'];
    sites.forEach((url) => {
      const ls = new Storage(url);
      if (ls) ls.setItem('cliqz', true);
    });
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
        country: prefs.get('config_location', ''),
        status: status || 'active',
      });


      try {
        ['http://cliqz.com', 'https://cliqz.com'].forEach((url) => {
          const ls = new Storage(url);
          ls.setItem('extension-info', info);
        });
      } catch (e) {
        console.log('Error setting localstorage', e);
      }
    }
  }

});
