import background from '../core/base/background';
import utils from '../core/utils';
import { isFirefox } from '../core/platform';
import { getLang } from '../platform/browser';
import prefs from '../core/prefs';
import HistoryManager from '../core/history-manager';
import loadLogoDb from '../platform/load-logo-db';

export default background({
  init() {
    utils.init({
      lang: getLang(),
    });

    this.checkSession();
    if(isFirefox){
      language.init();
      HistoryManager.init();
    }

    loadLogoDb().then(utils.setLogoDb);

    // @TODO: mobile doesn't use utils.app
    if (utils.app) {
      this.report = utils.setTimeout(this.reportStartupTime.bind(this), 1000 * 60);
    }
  },

  unload() {
    utils.clearTimeout(this.report);
    if (isFirefox) {
      language.unload();
      HistoryManager.unload();
    }
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

      utils.setTimeout(() => {
        this.setSupportInfo();
        if(config.settings.channel == 40){
          this.browserDetection();
        }
      }, 30000);

      prefs.set('session', session);
      prefs.set('install_date', session.split('|')[1]);
      prefs.set('new_session', true);
    } else {
      prefs.set('new_session', false);
    }
  },

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

});
