import { utils, events } from 'core/cliqz';
import md5 from 'core/helpers/md5';
import { getGeneralDomain } from 'antitracking/domain';
import ProxyPeer from 'proxyPeer/proxy-peer';


const ENABLE_PREF = 'attrackProxyTrackers';
const ENABLE_ALL_PROXY = 'attrackProxyAll';


function shouldProxyTrackers() {
  return utils.getPref(ENABLE_PREF, false);
}


function shouldProxyAll() {
  return utils.getPref(ENABLE_ALL_PROXY, false);
}


export default class {

  constructor(qsWhitelist) {
    // Use a local socks proxy to be able to 'hack' the HTTP lifecycle
    // inside Firefox. This allows us to proxy some requests in a peer
    // to peer fashion using WebRTC.
    this.pps = Components.classes['@mozilla.org/network/protocol-proxy-service;1']
      .getService(Components.interfaces.nsIProtocolProxyService);

    this.proxyPeer = null;
    this.proxy = null;
    this.initialised = false;

    this.urlsToProxy = new Set();

    this.proxyAll = shouldProxyAll();
    this.proxyTrackers = shouldProxyTrackers();

    this.qsWhitelist = qsWhitelist;

    this.proxyStats = new Map();
  }

  init() {
    if (this.isEnabled()) {
      // Check if we should instantiate a new proxy
      if (this.proxyPeer === null) {
        // Run local socks proxy
        this.proxyPeer = new ProxyPeer();

        // Inform Firefox to use our local proxy
        this.proxy = this.pps.newProxyInfo(
          'socks',                              // aType = socks5
          this.proxyPeer.getSocksProxyHost(),   // aHost
          this.proxyPeer.getSocksProxyPort(),   // aPort
          null,                                 // aFlags
          5000,                                 // aFailoverTimeout
          null);                                // aFailoverProxy

        // Filter used to determine which requests are to be proxied.
        // Position 2 since 'unblock/sources/proxy.es' is in position 1
        // and 'unblock/sources/request-listener.es' is in position 0.
        this.pps.registerFilter(this, 2);
      }
    }

    if (!this.initialised) {
      this.prefListener = this.onPrefChange.bind(this);
      events.sub('prefchange', this.prefListener);
    }

    this.initialised = true;
  }

  unload() {
    if (this.initialised) {
      if (this.proxyPeer !== null) {
        this.pps.unregisterFilter(this);
        this.proxyPeer.unload();
        this.proxyPeer = null;
        this.proxy = null;
      }

      events.un_sub('prefchange', this.prefListener);
      this.initialised = false;
    }
  }

  isEnabled() {
    return this.proxyTrackers || this.proxyAll;
  }

  onPrefChange(pref) {
    if (pref === ENABLE_PREF || pref === ENABLE_ALL_PROXY) {
      if (this.isEnabled() && !this.initialised) {
        this.init();
      } else if (!this.isEnabled() && this.initialised) {
        this.unload();
      }
    }

    if (pref === ENABLE_PREF) {
      this.proxyTrackers = !this.proxyTrackers;
    } else if (pref === ENABLE_ALL_PROXY) {
      this.proxyAll = !this.proxyAll;
    }
  }

  checkShouldProxy(state) {
    const hostname = state.urlParts.hostname;
    const hostGD = getGeneralDomain(hostname);
    const s = md5(hostGD).substr(0, 16);
    const isTrackerDomain = this.qsWhitelist.isTrackerDomain(s);

    if (this.shouldProxy(state.url, isTrackerDomain)) {
      state.incrementStat('proxy');

      // Counter number of requests proxied per GD
      let hostStats = this.proxyStats.get(hostGD);
      if (!hostStats) {
        hostStats = new Map();
        this.proxyStats.set(hostGD, hostStats);
      }

      hostStats.set(hostname, (hostStats.get(hostname) || 0) + 1);
    }

    return true;
  }

  shouldProxy(url, isTrackerDomain) {
    // Check if a url should be proxied. We have to do two lookups in the
    // set of domains `trackerDomains`, one for the full hostname, and one
    // for the general domain (the list contains several general domains for
    // which we shall proxy every queries).
    if (this.initialised) {
      // If everything should be proxied
      if (this.proxyAll || (this.proxyTrackers && isTrackerDomain)) {
        dump(`PROXY ${url}\n`);
        this.proxyOnce(url);
        return true;
      }
    }
    dump(`DO NOT PROXY ${url}\n`);

    return false;
  }

  proxyOnce(url) {
    this.urlsToProxy.add(url);
  }

  applyFilter(pps, url, defaultProxy) {
    if (this.urlsToProxy.has(url.asciiSpec)) {
      this.urlsToProxy.delete(url.asciiSpec);
      return this.proxy;
    }
    return defaultProxy;
  }
}
