import background from '../core/base/background';
import language from '../core/language';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import config from '../core/config';
import Storage from '../core/storage';
import pacemaker from '../core/services/pacemaker';

export default background({
  requiresServices: ['session', 'pacemaker'],

  init(settings = {}) {
    this.settings = settings;

    language.init();

    this.report = pacemaker.setTimeout(this.reportStartupTime.bind(this), 1000 * 60);

    this.supportInfo = pacemaker.setTimeout(() => {
      if (config.settings.channel === 40) {
        this.browserDetection();
      }
    }, 30 * 1000);
  },

  unload() {
    pacemaker.clearTimeout(this.report);
    this.report = null;

    pacemaker.clearTimeout(this.supportInfo);
    this.supportInfo = null;

    language.unload();
  },

  async reportStartupTime() {
    const core = inject.module('core');
    const status = await core.action('status');

    const telemetry = inject.service('telemetry', ['push']);

    telemetry.push({
      type: 'startup',
      modules: status.modules,
    });

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
    getSupportInfo() {
      const version = this.settings.version;
      const host = prefs.get('distribution.id', '', '');
      const hostVersion = prefs.get('distribution.version', '', '');
      const info = {
        version,
        host,
        hostVersion,
        country: prefs.get('config_location', ''),
        status: prefs.get('ext_status', '') || 'active',
      };
      return info;
    }
  }

});
