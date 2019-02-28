import background from '../core/base/background';
import utils from '../core/utils';
import language from '../core/language';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import config from '../core/config';
import Storage from '../core/storage';
import console from '../core/console';

export default background({
  requiresServices: ['utils', 'session'],

  init(settings = {}) {
    this.settings = settings;

    language.init();

    this.report = setTimeout(this.reportStartupTime.bind(this), 1000 * 60);

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
    language.unload();
  },

  async reportStartupTime() {
    const core = inject.module('core');
    const status = await core.action('status');

    utils.telemetry({
      type: 'startup',
      modules: status.modules,
    });

    const telemetry = inject.service('telemetry', ['push']);

    await telemetry.push(
      Object.keys(status.modules).map((module) => {
        const moduleStatus = status.modules[module];
        return {
          module,
          isEnabled: moduleStatus.isEnabled,
          loadingTime: moduleStatus.loadingTime,
          loadingTimeSync: moduleStatus.loadingTimeSync,
          windows: Object.keys(moduleStatus.windows).map(id => ({
            id, loadingTime: moduleStatus.windows[id].loadingTime,
          }))
        };
      }),
      'metrics.performance.app.startup',
    );

    const resourceLoaderReport = await core.action('reportResourceLoaders');

    telemetry.push(
      Object.keys(resourceLoaderReport).map(name => ({
        name,
        size: resourceLoaderReport[name].size,
      })),
      'metrics.performance.app.resource-loaders',
    );
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
