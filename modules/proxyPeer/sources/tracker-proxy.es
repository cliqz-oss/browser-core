import events from '../core/events';
import { getDetailsFromUrl } from '../core/url';
import prefs from '../core/prefs';
import logger from './logger';
import ProxyPeer from './proxy-peer';
import { CompositePolicy, TrackerWhitelistPolicy,
  PrivateIPBlacklistPolicy, PublicDomainOnlyPolicy,
  BloomFilterWhitelistPolicy } from './proxy-policy';
import ResourceLoader from '../core/resource-loader';
import config from '../core/config';
import { ifModuleEnabled } from '../core/kord/inject';


const PROXY_INSECURE_CONNECTIONS_PREF = 'proxyInsecureConnections';
const PROXY_PEER_PREF = 'proxyPeer';
const PROXY_TRACKERS_PREF = 'proxyTrackers';
const PROXY_ALL_PREF = 'proxyAll';

// Signaling server for WebRTC
const PROXY_SIGNALING_URL_PREF = 'proxySignalingUrl';
const PROXY_SIGNALING_DEFAULT = config.settings.TRACKER_PROXY_PROXY_SIGNALING_DEFAULT;

// Endpoint used to get the relay peers
const PROXY_PEERS_URL_PREF = 'proxyPeersUrl';
const PROXY_PEERS_DEFAULT = config.settings.TRACKER_PROXY_PROXY_PEERS_DEFAULT;

// Endpoint used to get the relay peers
const PROXY_PEERS_EXIT_URL_PREF = 'proxyPeersExitUrl';
const PROXY_PEERS_EXIT_DEFAULT = config.settings.TRACKER_PROXY_PROXY_PEERS_EXIT_DEFAULT;


function shouldProxyTrackers() {
  return prefs.get(PROXY_TRACKERS_PREF, false);
}


function shouldProxyAll() {
  return prefs.get(PROXY_ALL_PREF, false);
}


function shouldRunProxy() {
  return shouldProxyAll() || shouldProxyTrackers();
}


function shouldRunPeer() {
  return prefs.get(PROXY_PEER_PREF, false) || shouldRunProxy();
}


function shouldProxyInsecureConnections() {
  return prefs.get(PROXY_INSECURE_CONNECTIONS_PREF, false);
}


function getPrefOrDefault(pref, defaultValue) {
  let value = prefs.get(pref);
  if (!value) {
    value = defaultValue;
    prefs.set(pref, value);
  }

  return value;
}


function getSignalingUrl() {
  return getPrefOrDefault(PROXY_SIGNALING_URL_PREF, PROXY_SIGNALING_DEFAULT);
}


function getPeersUrl() {
  return getPrefOrDefault(PROXY_PEERS_URL_PREF, PROXY_PEERS_DEFAULT);
}


function getExitsUrl() {
  return getPrefOrDefault(PROXY_PEERS_EXIT_URL_PREF, PROXY_PEERS_EXIT_DEFAULT);
}


export default class TrackerProxy {
  constructor(antitracking, webRequestPipeline, p2p) {
    // Use a local socks proxy to be able to 'hack' the HTTP lifecycle
    // inside Firefox. This allows us to proxy some requests in a peer
    // to peer fashion using WebRTC.
    this.pps = Components.classes['@mozilla.org/network/protocol-proxy-service;1']
      .getService(Components.interfaces.nsIProtocolProxyService);

    // Internal state
    this.proxyPeer = null;
    this.signalingUrlHostname = null;
    this.peersUrlHostname = null;

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

    // External dependencies
    this.antitracking = antitracking;
    this.webRequestPipeline = webRequestPipeline;
    this.p2p = p2p;

    // Policies for when to proxy and when to block exit requests
    this.proxyPolicy = new PublicDomainOnlyPolicy();
    this.exitPolicy = new CompositePolicy();
    this.exitPolicy.addBlacklistPolicy(new PrivateIPBlacklistPolicy());
    this.proxyWhitelistLoader = new ResourceLoader(['proxyPeer', 'proxy_whitelist_bf.json'], {
      cron: 1000 * 60 * 60 * 12,
      remoteURL: `${config.settings.CDN_BASEURL}/anti-tracking/proxy_whitelist_bf.json`,
    });
  }

  isProxyEnabled() {
    return this.shouldProxyTrackers || this.shouldProxyAll;
  }

  isPeerEnabled() {
    return this.shouldRunPeer || this.isProxyEnabled();
  }

  initPeer() {
    if (this.isPeerEnabled() && this.proxyPeer === null) {
      const signalingUrl = getSignalingUrl();
      this.signalingUrlHostname = getDetailsFromUrl(signalingUrl).host;
      const peersUrl = getPeersUrl();
      this.peersUrlHostname = getDetailsFromUrl(peersUrl).host;
      const exitsUrl = getExitsUrl();
      this.exitsUrlHostname = getDetailsFromUrl(exitsUrl).host;

      this.proxyPeer = new ProxyPeer(
        signalingUrl,
        peersUrl,
        exitsUrl,
        this.exitPolicy,
        this.p2p,
      );

      return this.proxyPeer.init();
    }

    return Promise.resolve();
  }

  unloadPeer() {
    if (!this.isPeerEnabled() && this.proxyPeer !== null) {
      this.proxyPeer.unload();
      this.proxyPeer = null;
    }

    return Promise.resolve();
  }

  initProxy() {
    // Check if we need to create a firefox proxy interface.
    if (this.isProxyEnabled() && this.firefoxProxy === null) {
      // Inform Firefox to use our local proxy
      this.firefoxProxy = this.pps.newProxyInfo(
        'socks', // aType = socks5
        this.proxyPeer.getSocksProxyHost(), // aHost
        this.proxyPeer.getSocksProxyPort(), // aPort
        Components.interfaces.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST,
        5000, // aFailoverTimeout
        null // aFailoverProxy
      );

      this.pps.registerFilter(this, 0);
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
      return this.webRequestPipeline.action('addPipelineStep', 'onBeforeRequest', {
        name: 'checkShouldProxyAll',
        spec: 'blocking',
        after: ['determineContext'],
        fn: (state) => {
          // Here we must perform some additional checks so that the proxying
          // does not interfere with the signaling and WebRTC infrastructure.
          // In particular, we must check that calls to the signaling server
          // are not routed through the proxy network.
          const isSignalingServer = state.url.indexOf(this.signalingUrlHostname) !== -1;
          const isPeersServer = state.url.indexOf(this.peersUrlHostname) !== -1;
          const isExitsServer = state.url.indexOf(this.exitsUrlHostname) !== -1;
          // We also check that the current network policy allows this host to be proxied
          const proxyIsPermitted = this.proxyPolicy.shouldProxyAddress(state.urlParts.hostname);

          if (!(isSignalingServer || isPeersServer || isExitsServer) && proxyIsPermitted) {
            this.checkShouldProxyRequest(state);
          }
        },
      });
    }

    // Insert step immediately after antitracking pipeline.
    // TODO: at some point we might need to add the steps from antitracking to
    // the webrequest pipeline individually.
    if (this.shouldProxyTrackers) {
      return this.webRequestPipeline.action('addPipelineStep', 'onBeforeRequest', {
        name: 'checkShouldProxyTrackers',
        spec: 'blocking', // Can be done async
        after: ['antitracking.onBeforeRequest'],
        fn: this.checkShouldProxyRequest.bind(this),
      });
    }

    return Promise.resolve();
  }

  initPolicy() {
    const firstPartyWhitelist = new BloomFilterWhitelistPolicy();
    const loadCallback = firstPartyWhitelist.updateBloomFilter.bind(firstPartyWhitelist);

    this.proxyWhitelistLoader.onUpdate(loadCallback);
    return this.proxyWhitelistLoader.load().then(loadCallback)
      .then(() => (
        this.antitracking.action('getWhitelist').then((qsWhitelist) => {
          const trackerWhitelist = new TrackerWhitelistPolicy(qsWhitelist);
          // trackers are always proxied; public others must be in the first party whitelist
          this.proxyPolicy.setOverridePolicy(trackerWhitelist);
          this.proxyPolicy.setRequiredPolicy(firstPartyWhitelist);
          // the exit policy is trackers or popular domains
          this.exitPolicy.addWhitelistPolicy(trackerWhitelist);
          this.exitPolicy.addWhitelistPolicy(firstPartyWhitelist);
        })
      ));
  }

  unloadProxy() {
    if (this.firefoxProxy !== null) {
      this.pps.unregisterFilter(this);
      this.firefoxProxy = null;
    }

    // If steps were not present in the pipeline, this will just be ignored
    return Promise.all([
      ifModuleEnabled(this.webRequestPipeline.action('removePipelineStep', 'onBeforeRequest', 'checkShouldProxyTrackers')),
      ifModuleEnabled(this.webRequestPipeline.action('removePipelineStep', 'onBeforeRequest', 'checkShouldProxyAll')),
    ]).catch(() => {}); // This should not fail
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
    return this.initPolicy()
      .then(() => this.initPeer())
      .then(() => this.initProxy());
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
      logger.error('cannot proxy: tracker-proxy not yet initialized');
      return false;
    }

    if (this.proxyPeer === null || this.proxyPeer.socksToRTC === null) {
      logger.error('cannot proxy: proxyPeer not yet initialized');
      return false;
    }

    const availablePeers = this.proxyPeer.socksToRTC.peers.length;
    if (availablePeers < 2) {
      logger.error(`cannot proxy: not enough peers available (${availablePeers})`);
      return false;
    }

    if (this.shouldProxyAll || (this.shouldProxyTrackers && isTrackerDomain)) {
      const isHttps = url.indexOf('https://') === 0;
      const isHttp = url.indexOf('http://') === 0;

      // Ignore https if proxyHttp is false
      if (isHttp && !this.shouldProxyInsecureConnections) {
        logger.error(`do not proxy non-https ${url}`);
        return false;
      }

      if (isHttp || isHttps) {
        logger.debug(`proxy: ${url}`);
        this.proxyOnce(url);
        return true;
      }
    }

    logger.debug(`do *not* proxy: ${url}`);

    return false;
  }

  proxyOnce(url) {
    this.urlsToProxy.add(url);
  }

  applyFilter(pps, url, defaultProxy, cb) {
    let proxy;
    if (this.urlsToProxy.has(url.asciiSpec)) {
      this.urlsToProxy.delete(url.asciiSpec);
      proxy = this.firefoxProxy;
    } else {
      proxy = defaultProxy;
    }
    // On Firefox 60+ we need to use the callback
    if (cb && cb.onProxyFilterResult) {
      cb.onProxyFilterResult(proxy);
    } else {
      return proxy;
    }
    return undefined;
  }
}
