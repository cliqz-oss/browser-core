import background from '../core/base/background';
import inject from '../core/kord/inject';
import ResourceLoader from '../core/resource-loader';
import Logger from '../core/logger';
import AdDetector from './ad-detector';

const logger = Logger.get('your-ad-value', { level: 'log' });

/**
 * This module detects pricing information in ad-network requests and reports back
 * with humanweb messages about the prices observed.
 *
 * Collaboration with Telefonica/UoC. Based on the code in this extension:
 * https://github.com/mipach/YourAdValueFirefox
 *
  @namespace <namespace>
  @class Background
 */
export default background({

  webRequest: inject.module('webrequest-pipeline'),
  hpn: inject.module('hpnv2'),

  /**
    @method init
    @param settings
  */
  async init(settings) {
    this.configLoader = new ResourceLoader(['your-ad-value', 'config.json'], {
      cron: 1000 * 60 * 60 * 24,
      remoteURL: `${settings.CDN_BASEURL}/anti-tracking/advalue-config.json`,
    });
    this.detector = new AdDetector();
    this.updateDetectorConfig(await this.configLoader.load());
    this.configLoader.onUpdate((contents) => {
      this.updateDetectorConfig(contents);
    });
    await this.detector.init();
    this.webRequest.action('addPipelineStep', 'onBeforeRequest', {
      name: 'your-ad-value.detector',
      spec: 'collect',
      fn: this.detector.onRequest.bind(this.detector),
    });

    this._sendTelemetry = this.sendTelemetry.bind(this);
    this.detector.on('telemetry', this._sendTelemetry);
  },

  updateDetectorConfig(config) {
    const { keywords, vendorKeywords, adDomains } = config;
    this.detector.keywords = new Set(keywords);
    this.detector.vendorKeywords = vendorKeywords;
    this.detector.adDomains = new Set(adDomains);
  },

  sendTelemetry(payload) {
    logger.info('message', payload);
    this.hpn.action('sendTelemetry', {
      action: 'attrack.advalue',
      payload,
    });
  },

  unload() {
    this.configLoader.stop();
    if (this._sendTelemetry) {
      this.detector.unsubscribe('telemetry', this._sendTelemetry);
    }
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },
});
