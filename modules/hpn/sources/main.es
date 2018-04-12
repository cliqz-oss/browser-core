/*
 This module is used for sending the events for purpose of
 human-web, anti-tracking via a secure channel.
*/

import Storage from '../platform/hpn/storage';
import CliqzUtils from '../core/utils';
import config from '../core/config';
import ResourceLoader from '../core/resource-loader';
import MessageSender from './send-message';
import * as hpnUtils from './utils';
import console from '../core/console';
import { overRideCliqzResults } from './http-handler-patch';
import ProxyFilter from './proxy-filter';
import CryptoWorker from './crypto-worker';
import { createProxyList, getProxyVerifyUrl } from './routing';

/* Global variables
*/
let proxyCounter = 0;

const CliqzSecureMessage = {
  CHANNEL: config.settings.HPN_CHANNEL,
  VERSION: '0.1',
  LOG_KEY: 'securemessage',
  debug: false,
  counter: 0,
  secureLogger: {},
  uPK: {},
  dsPK: {},
  routeTable: null,
  routeTableLoader: null,
  RSAKey: '',
  eventID: {},
  sourceMap: null,
  sourceMapLoader: null,
  tmult: 4,
  tpace: 250,
  SOURCE_MAP_PROVIDER: config.settings.ENDPOINT_SOURCE_MAP_PROVIDER,
  LOOKUP_TABLE_PROVIDER: config.settings.ENDPOINT_LOOKUP_TABLE_PROVIDER,
  KEYS_PROVIDER: config.settings.ENDPOINT_KEYS_PROVIDER,
  proxyList: null,
  proxyStats: {},
  PROXY_LIST_PROVIDER: config.settings.ENDPOINT_PROXY_LIST_PROVIDER,
  BLIND_SIGNER: config.settings.ENDPOINT_BLIND_SIGNER,
  USER_REG: config.settings.ENDPOINT_USER_REG,
  localTemporalUniq: null,
  wCrypto: null,
  queriesID: {},
  servicesToProxy: ['api.cliqz.com', 'antiphishing.cliqz.com'],
  proxyInfoObj: {},
  queryProxyFilter: null,
  pacemaker() {
    CliqzSecureMessage.counter += 1;

    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % 10 === 0) {
      if (CliqzSecureMessage.debug) {
        CliqzUtils.log(`Pacemaker: ${CliqzSecureMessage.counter / CliqzSecureMessage.tmult}`, CliqzSecureMessage.LOG_KEY);
      }
    }

    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % 5 === 0) {
      const currentTime = Date.now();


      if (!CliqzUtils.getWindow()
        || !CliqzUtils.getWindow().CLIQZ
        || !CliqzUtils.getWindow().CLIQZ.UI) {
        return;
      }
      const tDiff = currentTime - CliqzUtils.getWindow().CLIQZ.UI.lastInputTime;

      if (tDiff > 0 && tDiff > (1000 * 2 * 1)) {
        CliqzSecureMessage.proxyIP();
      }

      if ((!CliqzSecureMessage.uPK.publicKeyB64) || (!CliqzSecureMessage.uPK.privateKey)) {
        CliqzSecureMessage.registerUser();
      }
    }

    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % (60 * 15 * 1) === 0) {
      if (CliqzSecureMessage.debug) {
        CliqzUtils.log('Clean local temp queue', CliqzSecureMessage.LOG_KEY);
      }
      hpnUtils.prunelocalTemporalUniq();
    }
  },
  // ****************************
  // telemetry, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
  // ****************************
  trk: [],
  trkTimer: null,
  telemetry(msg, instantPush) {
    if (!CliqzSecureMessage || // might be called after the module gets unloaded
        CliqzUtils.getPref('humanWebOptOut', false)) return;

    if (msg) CliqzSecureMessage.trk.push(msg);
    CliqzUtils.clearTimeout(CliqzSecureMessage.trkTimer);
    if (instantPush || CliqzSecureMessage.trk.length % 20 === 0) {
      CliqzSecureMessage.pushTelemetry();
    } else {
      CliqzSecureMessage.trkTimer = CliqzUtils.setTimeout(CliqzSecureMessage.pushTelemetry, 10000);
    }
  },
  _telemetry_req: null,

  telemetry_MAX_SIZE: 500,
  previousDataPost: null,
  pushMessage: [],
  routeHashTable: null,
  queryProxyIP: null,
  performance: null,

  pushTelemetry() {
    // Take all available messages from the 'trk' queue and send them.
    //
    // It is crucial that messages are sent sequentially, otherwise, we
    // will have race conditions due to the use of global variables
    // in CliqzSecureMessage messages sequentially, too.
    const unprocessedMessages = CliqzSecureMessage.trk.splice(0);
    return CliqzSecureMessage.messageSender.send(unprocessedMessages);
  },
  initAtWindow() {
  },
  init() {
    // Doing it here, because this lib. uses navigator and window objects.
    // Better method appriciated.

    if (CliqzSecureMessage.pacemakerId == null) {
      CliqzSecureMessage.pacemakerId = CliqzUtils.setInterval(
        CliqzSecureMessage.pacemaker.bind(this),
        CliqzSecureMessage.tpace,
        null
      );
    }

    // TODO: do not pass this to storage
    this.storage = new Storage(this);

    if (!CliqzSecureMessage.localTemporalUniq) this.storage.loadLocalCheckTable();

    // Load source map. Update it once an hour.
    this.sourceMapLoader = new ResourceLoader(
      ['hpn', 'sourcemap.json'],
      {
        remoteURL: CliqzSecureMessage.SOURCE_MAP_PROVIDER
      }
    );

    this.sourceMapLoader.load().then((e) => {
      CliqzSecureMessage.sourceMap = e;
    });

    this.sourceMapLoader.onUpdate((e) => {
      CliqzSecureMessage.sourceMap = e;
    });

    // Load lookuptable, which also contains the list of proxy list.
    // Update every 5 minutes.
    this.routeTableLoader = new ResourceLoader(
      ['hpn', 'routeTableV2.json'],
      {
        remoteURL: CliqzSecureMessage.LOOKUP_TABLE_PROVIDER,
        cron: 1 * 5 * 60 * 1000,
        updateInterval: 1 * 5 * 60 * 1000,
      }
    );

    this.routeTableLoader.load().then((fullRouteTable) => {
      CliqzSecureMessage._updateRoutingInfo(fullRouteTable);
    }).catch((e) => {
      if (CliqzSecureMessage.debug) {
        console.error('Failed to update initial routeTable', e);
      }
    });

    this.routeTableLoader.onUpdate((fullRouteTable) => {
      CliqzSecureMessage._updateRoutingInfo(fullRouteTable);
    });

    CliqzSecureMessage.dsPK.pubKeyB64 = config.settings.KEY_DS_PUBKEY;
    CliqzSecureMessage.secureLogger.publicKeyB64 = config.settings.KEY_SECURE_LOGGER_PUBKEY;

    if (CliqzUtils.getPref('proxyNetwork', true)) {
      overRideCliqzResults();
    }
    // Check user-key present or not.
    CliqzSecureMessage.registerUser();

    // Register proxy fr query.

    CliqzSecureMessage.queryProxyFilter = new ProxyFilter();
    CliqzSecureMessage.queryProxyFilter.init();

    this.messageSender = new MessageSender();
  },
  unload() {
    CliqzSecureMessage.queryProxyFilter.unload();
    this.storage.saveLocalCheckTable();

    // TODO: Sending messages like this does not work
    // as the shutdown will be faster than sending the
    // messages. As a result, messages are not sent
    // the web worker is not closed.
    //
    // const messageSender_ = this.messageSender;
    // CliqzSecureMessage.pushTelemetry().then(() => {
    //   messageSender_.stop();
    // }).catch((e) => {
    //   messageSender_.stop({ quick: true });
    // });
    //
    // As a workaround, make no attempt to send messages
    // (as it will not succeed anyway) but at least
    // terminate the worker.
    this.messageSender.stop({ quick: true });

    this.sourceMapLoader.stop();
    this.routeTableLoader.stop();
    CliqzUtils.clearTimeout(CliqzSecureMessage.pacemakerId);
    this.storage.close();
  },
  proxyIP() {
    if (!CliqzSecureMessage.proxyList) return undefined;

    if (proxyCounter >= CliqzSecureMessage.proxyList.length) {
      proxyCounter = 0;
    }
    const proxy = CliqzSecureMessage.proxyList[proxyCounter];
    const proxyUrl = getProxyVerifyUrl({
      host: proxy.dns,
      ip: proxy.ip,
      supportsHttps: proxy.ssl
    });
    CliqzSecureMessage.queryProxyIP = proxyUrl;
    proxyCounter += 1;
    return proxyUrl;
  },
  registerUser() {
    this.storage.loadKeys().then((userKey) => {
      if (!userKey) {
        const userCrypto = new CryptoWorker();

        userCrypto.onmessage = (e) => {
          if (e.data.status) {
            const uK = {};
            uK.privateKey = e.data.privateKey;
            uK.publicKey = e.data.publicKey;
            uK.ts = Date.now();
            this.storage.saveKeys(uK).then((response) => {
              if (response.status) {
                CliqzSecureMessage.uPK.publicKeyB64 = response.data.publicKey;
                CliqzSecureMessage.uPK.privateKey = response.data.privateKey;
              }
            });
          }
          userCrypto.terminate();
        };

        userCrypto.postMessage({
          type: 'user-key'
        });
      } else {
        CliqzSecureMessage.uPK.publicKeyB64 = userKey.publicKey;
        CliqzSecureMessage.uPK.privateKey = userKey.privateKey;
      }
    });
  },

  _updateRoutingInfo(fullRouteTable) {
    CliqzSecureMessage.routeTable = fullRouteTable[CliqzSecureMessage.CHANNEL];
    CliqzSecureMessage.proxyList = createProxyList(CliqzSecureMessage.routeTable);
    CliqzUtils.log('Updated proxy list and routing table', CliqzSecureMessage.LOG_KEY);

    // make sure "CliqzSecureMessage.queryProxyIP" is initialized
    CliqzSecureMessage.proxyIP();
  }
};
export default CliqzSecureMessage;
