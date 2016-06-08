import { utils, events } from 'core/cliqz';
import { URLInfo } from 'antitracking/url';
import ResourceLoader from 'core/resource-loader';

const ENABLE_PREF = 'attrackProxyTrackers';

export default class {

  constructor() {
    this.pps = Components.classes['@mozilla.org/network/protocol-proxy-service;1']
      .getService(Components.interfaces.nsIProtocolProxyService);
    this.proxy = null;
    this.trackerDomains = new Set();
    this.proxyUrls = new Set();
  }

  isEnabled() {
    return utils.getPref(ENABLE_PREF, false);
  }

  init() {
    if ( this.isEnabled() ) {
      this.pps.registerFilter(this, 2);
      this._loader = new ResourceLoader( ['antitracking', 'tracker_proxy_conf.json'], {
        remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_proxy_conf.json',
        cron: 24 * 60 * 60 * 1000
      });
      this._loader.load().then(this._loadProxyConfiguration.bind(this));
      this._loader.onUpdate(this._loadProxyConfiguration.bind(this));
    }
    this.prefListener = this.onPrefChange.bind(this);
    events.sub('prefchange', this.prefListener);
  }

  unload() {
    if ( this.initialised ) {
      this.pps.unregisterFilter(this);
      this.proxy = null;
    }
  }

  destroy() {
    this.unload();
    events.un_sub('prefchange', this.prefListener);
  }

  onPrefChange(pref) {
    if ( pref === ENABLE_PREF ) {
      if ( this.isEnabled() && !this.initialised ) {
        this.init();
      } else if( !this.isEnabled() && this.initialised ) {
        this.unload();
      }
    }
  }

  _loadProxyConfiguration(conf) {
    if ( conf.proxy ) {
      this.proxy = this.pps.newProxyInfo(conf.proxy.type, conf.proxy.host, conf.proxy.port, null, 5000, null);
    }
    if ( conf.domains ) {
      this.trackerDomains = new Set( conf.domains );
    }
  }

  get initialised() {
    return this.proxy !== null;
  }

  checkShouldProxy(url) {
    if ( this.initialised && this.trackerDomains.has( URLInfo.get(url).hostname )) {
      this.proxyOnce(url);
      return true;
    } else {
      return false;
    }
  }

  proxyOnce(url) {
    this.proxyUrls.add(url);
  }

  applyFilter(pps, url, default_proxy) {
    if ( this.proxyUrls.has(url.asciiSpec) ) {
      this.proxyUrls.delete(url.asciiSpec);
      return this.proxy;
    }
    return default_proxy;
  }

}
