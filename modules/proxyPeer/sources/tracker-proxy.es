import { utils, events } from '../core/cliqz';
import console from './console';
import ProxyPeer from './proxy-peer';


const PROXY_INSECURE_CONNECTIONS_PREF = 'proxyInsecureConnections';
const PROXY_PEER_PREF = 'proxyPeer';
const PROXY_TRACKERS_PREF = 'proxyTrackers';
const PROXY_ALL_PREF = 'proxyAll';


function shouldProxyTrackers() {
  return utils.getPref(PROXY_TRACKERS_PREF, false);
}


function shouldProxyAll() {
  return utils.getPref(PROXY_ALL_PREF, false);
}


function shouldRunProxy() {
  return shouldProxyAll() || shouldProxyTrackers();
}


function shouldRunPeer() {
  return utils.getPref(PROXY_PEER_PREF, false) || shouldRunProxy();
}


function shouldProxyInsecureConnections() {
  return utils.getPref(PROXY_INSECURE_CONNECTIONS_PREF, false);
}


export default class {

  constructor(antitracking) {
    // Use a local socks proxy to be able to 'hack' the HTTP lifecycle
    // inside Firefox. This allows us to proxy some requests in a peer
    // to peer fashion using WebRTC.
    this.pps = Components.classes['@mozilla.org/network/protocol-proxy-service;1']
      .getService(Components.interfaces.nsIProtocolProxyService);

    // Internal state
    this.proxyPeer = null;
    this.firefoxProxy = null;
    this.prefListener = null;

    // Store current prefs
    this.shouldProxyAll = shouldProxyAll();
    this.shouldProxyTrackers = shouldProxyTrackers();
    this.shouldRunPeer = shouldRunPeer();
    this.shouldProxyInsecureConnections = shouldProxyInsecureConnections();

    // Proxy state
    this.urlsToProxy = new Set();
    this.proxyStats = new Map();
    this.antitracking = antitracking;
  }

  isProxyEnabled() {
    return this.shouldProxyTrackers || this.shouldProxyAll;
  }

  isPeerEnabled() {
    return this.shouldRunPeer || this.isProxyEnabled();
  }

  initPeer() {
    if (this.isPeerEnabled() && this.proxyPeer === null) {
      this.proxyPeer = new ProxyPeer();
      return this.proxyPeer.init();
    }

    return Promise.resolve();
  }

  unloadPeer() {
    if (!this.isPeerEnabled() && this.proxyPeer !== null) {
      this.proxyPeer.unload();
      this.proxyPeer = null;
    }
  }

  initProxy() {
    // Check if we need to create a firefox proxy interface.
    if (this.isProxyEnabled() && this.firefoxProxy === null) {
      // Inform Firefox to use our local proxy
      this.firefoxProxy = this.pps.newProxyInfo(
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

    // Depending on if we want to proxyAll or proxyTrackers, the step should be
    // inserted at a different position in the antitracking pipeline.
    //
    // *proxyAll* it should be inserted as early as possible, so that we see all
    // the requests, including the ones from first-parties.
    //
    // *proxyTrackers* it should be inserted as soon as the `isTracker`
    // information is available in the state.
    //
    // In any case, only one step is required at any point of time.

    // Insert step as soon as context (urlParts) is available
    if (this.shouldProxyAll) {
      return this.antitracking.action('addPipelineStep', {
        name: 'checkShouldProxyAll',
        stages: ['open'],
        after: ['determineContext'],
        fn: (state) => {
          // Here we must perform some additional checks so that the proxying
          // does not interfere with the signaling and WebRTC infrastructure.
          // In particular, we must check that calls to the signaling server
          // or https://hpn-sign.cliqz.com/ are not proxied.
          const isSignalingServer = state.url.indexOf(this.proxyPeer.signalingURL) !== -1;
          const isHpnPeerEndpoint = state.url.indexOf('https://hpn-sign.cliqz.com/') === 0;

          if (!(isSignalingServer || isHpnPeerEndpoint)) {
            this.checkShouldProxyRequest(state);
          }

          // We will never interrupt the antitracking pipeline from this step.
          return true;
        },
      });
    }

    // Insert step immediately after `isTrack` information is available.
    if (this.shouldProxyTrackers) {
      return this.antitracking.action('addPipelineStep', {
        name: 'checkShouldProxyTrackers',
        stages: ['open'],
        after: ['findBadTokens'],
        fn: this.checkShouldProxyRequest.bind(this),
      });
    }

    return Promise.resolve();
  }

  unloadProxy() {
    if (this.firefoxProxy !== null) {
      this.pps.unregisterFilter(this);
      this.firefoxProxy = null;
    }

    // If steps were not present in the pipeline, this will just be ignored
    return Promise.all([
      this.antitracking.action('removePipelineStep', 'checkShouldProxyTrackers'),
      this.antitracking.action('removePipelineStep', 'checkShouldProxyAll'),
    ]);
  }

  initPrefListener() {
    if (this.prefListener === null) {
      this.prefListener = this.onPrefChange.bind(this);
      events.sub('prefchange', this.prefListener);
    }

    return Promise.resolve();
  }

  init() {
    this.initPrefListener();
    return this.initPeer()
      .then(() => {
        this.initProxy();
      });
  }

  unload() {
    if (this.prefListener !== null) {
      events.un_sub('prefchange', this.prefListener);
    }

    return this.unloadProxy()
      .then(() => this.unloadPeer());
  }

  onPrefChange(pref) {
    if (pref === PROXY_INSECURE_CONNECTIONS_PREF) {
      this.shouldProxyInsecureConnections = shouldProxyInsecureConnections();
    }

    if ([PROXY_ALL_PREF, PROXY_TRACKERS_PREF, PROXY_PEER_PREF].indexOf(pref) !== -1) {
      // Update prefs with new values
      this.shouldProxyTrackers = shouldProxyTrackers();
      this.shouldProxyAll = shouldProxyAll();
      this.shouldRunPeer = shouldRunPeer();

      // Load/Unload if any pref changed
      // This works because unload and init are no-ops if the
      // preferences did not change.
      this.unloadProxy()
        .then(() => this.unloadPeer())
        .then(() => this.initPeer())
        .then(() => this.initProxy());
    }
  }

  checkShouldProxyRequest(state) {
    const hostname = state.urlParts.hostname;
    const hostGD = state.urlParts.generalDomain;
    const isTrackerDomain = state.isTracker; // from token-checker step

    if (this.checkShouldProxyURL(state.url, isTrackerDomain)) {
      // Only keep track of proxied third-parties requests. We won't keep track
      // of all requests proxied in `proxyAll` mode, but this should only be
      // used for testing purposes.
      if (state.incrementStat) {
        state.incrementStat('proxy');
      }

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

  checkShouldProxyURL(url, isTrackerDomain) {
    if (this.firefoxProxy === null) {
      console.error('proxyPeer cannot proxy: tracker-proxy not yet initialized');
      return false;
    }

    if (this.proxyPeer === null || this.proxyPeer.socksToRTC === null) {
      console.error('proxyPeer cannot proxy: proxyPeer not yet initialized');
      return false;
    }

    const availablePeers = this.proxyPeer.socksToRTC.availablePeers.length;
    if (availablePeers < 2) {
      console.error(`proxyPeer cannot proxy: not enough peers available (${availablePeers})`);
      return false;
    }

    if (this.shouldProxyAll || (this.shouldProxyTrackers && isTrackerDomain)) {
      const isHttps = url.indexOf('https://') === 0;
      const isHttp = url.indexOf('http://') === 0;

      // Ignore https if proxyHttp is false
      if (isHttp && !this.shouldProxyInsecureConnections) {
        console.error(`proxyPeer do not proxy non-https ${url}`);
        return false;
      }

      if (isHttp || isHttps) {
        console.debug(`proxyPeer proxy: ${url}`);
        this.proxyOnce(url);
        return true;
      }
    }

    console.debug(`proxyPeer do *not* proxy: ${url}`);

    return false;
  }

  proxyOnce(url) {
    this.urlsToProxy.add(url);
  }

  applyFilter(pps, url, defaultProxy) {
    if (this.urlsToProxy.has(url.asciiSpec)) {
      this.urlsToProxy.delete(url.asciiSpec);
      return this.firefoxProxy;
    }
    return defaultProxy;
  }
}
