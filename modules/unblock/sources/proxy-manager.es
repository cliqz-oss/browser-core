import ResourceLoader from 'core/resource-loader';

/**
  Proxy manager class
 */
export default class {
  constructor(proxy_service) {
    this.proxy_service = proxy_service;
    this._p = {};
    this._region_counters = {};
    this._last = null;
    this._preferred_regions = ['IR', 'US', 'UK', 'DE'];
    this.PROXY_UPDATE_URL = 'https://cdn.cliqz.com/unblock/proxies.json';
    this._loader = null;
  }

  init() {
    this._loader = new ResourceLoader(
      [ 'unblock', 'proxies.json' ],
      {
        remoteURL: this.PROXY_UPDATE_URL,
        cron: 24 * 60 * 60 * 1000, // 24 hours
      }
    );

    var update = this.updateProxyList.bind(this);
    this._loader.load().then(update);
    this._loader.onUpdate(update);
  }

  destroy() {
    this._loader.stop();
  }

  getAvailableRegions() {
    return Object.keys(this._p);
  }

  getLastUsed() {
    return this._last;
  }

  addProxy(region, proxy) {
    if (!(region in this._p)) {
      this._p[region] = [];
      this._region_counters[region] = -1;
    }
    CliqzUtils.log("Adding proxy: "+ proxy['type'] + "://" + proxy['host'] + ":" + proxy['port'], "unblock");
    this._p[region].push(proxy);
  }

  getPreferredRegion(allowed_regions) {
    return this._preferred_regions.find(function(reg) {
      return allowed_regions.indexOf(reg) > -1 && reg in this._p && this._p[reg].length > 0
    }.bind(this)) || allowed_regions[0];
  }

  getNextProxy(region) {
    if(!(region in this._region_counters)) {
      return null;
    }
    this._region_counters[region] = (this._region_counters[region] + 1) % this._p[region].length;
    return this._p[region][this._region_counters[region]];
  }

  removeProxy(region, proxy) {
    let ind = this._p[region].indexOf(proxy);
    if (ind > -1) {
      this._p[region].splice(ind, 1);
    }
  }

  updateProxyList(proxies) {
    var self = this;
    // reset proxy list
    self._p = {};
    self._preferred_regions = proxies['regions'];
    for (let region in proxies['proxies']) {
      proxies['proxies'][region].forEach(function (proxy) {
        self.addProxy(region, self.proxy_service.createProxy(proxy));
      });
    }
  }
};
