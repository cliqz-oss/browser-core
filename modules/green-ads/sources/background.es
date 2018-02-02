import background from '../core/base/background';
import events from '../core/events';
import inject from '../core/kord/inject';
import { extractHostname } from '../core/tlds';
import { promiseHttpHandler } from '../core/http';
import { utils } from '../core/cliqz';

import GreenAds from './green-ads';
import logger from './logger';
import Inventory from './inventory';


// The green ad module can be in different states:
export const GREENADS_PREF = 'greenads';
export const GREENADS_STATE = {
  DISABLED: 'disabled', // We don't record anything
  COLLECT: 'collect', // We record normal page behavior (no blocking or ad injection)
  GREEN: 'green', // We record green mode (blocking of ads + injection of cached)
};

const TELEMETRY_ENDPOINT = 'https://safebrowsing-experiment.cliqz.com';


export function getGreenadsState() {
  // Only enable when adblocker is disabled
  const adbEnabled = utils.getPref('cliqz-adb', false);
  if (adbEnabled) return GREENADS_STATE.DISABLED;

  // Otherwise, check green-ads pref
  const value = utils.getPref(GREENADS_PREF, null);

  if (value === GREENADS_STATE.GREEN) {
    return GREENADS_STATE.GREEN;
  } else if (value === GREENADS_STATE.COLLECT) {
    return GREENADS_STATE.COLLECT;
  } else if (value === GREENADS_STATE.DISABLED) {
    return GREENADS_STATE.DISABLED;
  }

  utils.setPref(GREENADS_PREF, GREENADS_STATE.DISABLED);
  return GREENADS_STATE.DISABLED;
}


export function toggleGreenAdsPref() {
  const value = getGreenadsState();

  if (value === GREENADS_STATE.COLLECT) {
    utils.setPref(GREENADS_PREF, GREENADS_STATE.GREEN);
  } else if (value === GREENADS_STATE.GREEN) {
    utils.setPref(GREENADS_PREF, GREENADS_STATE.COLLECT);
  }
}


export function greenAdsEnabled() {
  return getGreenadsState() !== GREENADS_STATE.DISABLED;
}


function isGreenMode() {
  return getGreenadsState() === GREENADS_STATE.GREEN;
}


export default background({
  antitracking: inject.module('antitracking'),
  webRequestPipeline: inject.module('webrequest-pipeline'),
  core: inject.module('core'),

  enabled() { return true; },

  initImpl() {
    this.sendTimeout = null;
    this.greenAds = null;
    this.inventory = null;

    if (greenAdsEnabled()) {
      logger.log(`init background (state: ${getGreenadsState()})`);

      // Init greenads both in `green` and `collect` mode.
      this.greenAds = new GreenAds(
        getGreenadsState() === GREENADS_STATE.GREEN, /* is in green mode? */
        this.antitracking, /* give proxy to antitracking */
        this.webRequestPipeline,
        this.sendTelemetry.bind(this),
      );

      // Only load the inventory in `green` mode
      if (isGreenMode()) {
        this.inventory = new Inventory();

        // When a new version of the inventory is available, broadcast it to all
        // process scripts.
        this.inventory.onUpdate(() => {
          this.actions.updateProcessScripts({
            getInventory: true,
          });
        });

        // initialise process script state
        this.actions.updateProcessScripts({
          getMode: true,
          getInventory: true,
        });
      }

      return this.greenAds.init();
    }

    return Promise.resolve();
  },

  init() {
    return this.initImpl();
  },

  unloadImpl() {
    const promises = [];

    if (this.greenAds) {
      promises.push(this.greenAds.unload());
      this.greenAds = null;
    }

    if (this.inventory) {
      promises.push(this.inventory.unload());
      this.inventory = null;
    }

    utils.clearTimeout(this.sendTimeout);

    return Promise.all(promises);
  },

  unload() {
    return this.unloadImpl();
  },

  shouldProxyAction(url) {
    if (this.greenAds === null) {
      return false;
    }

    return this.greenAds.shouldProceedWithUrl(url);
  },

  sendTelemetry(message) {
    // delay push by 20s to not interfer with current activity
    this.sendTimeout = utils.setTimeout(() => {
      promiseHttpHandler('POST', TELEMETRY_ENDPOINT,
        JSON.stringify(message), 10000, true);
    }, 20000);
  },

  events: {
    'process:init': function onNewProcess(processId) {
      if (greenAdsEnabled()) {
        this.actions.updateProcessScripts({
          processId,
          getInventory: true,
          getMode: true
        });
      }
    },
    /**
     * Monitor preference changes in about:config and check if we should
     * enable or disable this module.
     */
    prefchange(pref) {
      if (pref === 'cliqz-adb' || pref === GREENADS_PREF) {
        return this.unloadImpl()
          .then(() => this.actions.updateProcessScripts({
            getMode: true,
          }))
          .then(() => {
            if (greenAdsEnabled()) {
              return this.initImpl();
            }

            return Promise.resolve();
          })
          .then(() => {
            // Broadcast new mode to all processes
            events.pub('greenads:reloaded');
          });
      }

      return Promise.resolve();
    },
    'core:mouse-down': function onMouseDown(ev) {
      if (!this.greenAds) return;

      const originUrl = ev.target.baseURI;
      const windowTreeInformation = ev.target.windowTreeInformation;

      // Refresh the activity of the current tab
      this.greenAds.touchTab(windowTreeInformation, originUrl);

      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onUserActivity(
        windowTreeInformation,
        originUrl,
        Date.now(),
        'mouse-down',
      );
    },
    'core:key-press': function onKeyPress(ev) {
      if (!this.greenAds) return;

      const originUrl = ev.target.baseURI;
      const windowTreeInformation = ev.target.windowTreeInformation;

      // Refresh the activity of the current tab
      this.greenAds.touchTab(windowTreeInformation, originUrl);

      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onUserActivity(
        windowTreeInformation,
        originUrl,
        Date.now(),
        'key-press',
      );
    },
    'core:mouse-move': function onMouseMove(ev) {
      if (!this.greenAds) return;

      const originUrl = ev.target.baseURI;
      const windowTreeInformation = ev.target.windowTreeInformation;

      // Refresh the activity of the current tab
      this.greenAds.touchTab(windowTreeInformation, originUrl);

      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onUserActivity(
        windowTreeInformation,
        originUrl,
        Date.now(),
        'mouse-move',
      );
    },
    'core:scroll': function onScroll(ev) {
      if (!this.greenAds) return;

      const originUrl = ev.target.baseURI;
      const windowTreeInformation = ev.target.windowTreeInformation;

      // Refresh the activity of the current tab
      this.greenAds.touchTab(windowTreeInformation, originUrl);

      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onUserActivity(
        windowTreeInformation,
        originUrl,
        Date.now(),
        'scoll',
      );
    },
    'core:copy': function onCopy(ev) {
      if (!this.greenAds) return;

      const originUrl = ev.target.baseURI;
      const windowTreeInformation = ev.target.windowTreeInformation;

      // Refresh the activity of the current tab
      this.greenAds.touchTab(windowTreeInformation, originUrl);

      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onUserActivity(
        windowTreeInformation,
        originUrl,
        Date.now(),
        'copy',
      );
    },
    'content:state-change': function onStateChange({ url, originalUrl, triggeringUrl, windowTreeInformation }) {
      if (!this.greenAds) return;
      if (this.greenAds.greenMode) return;
      this.greenAds.onStateChange(windowTreeInformation, originalUrl, triggeringUrl, url);
    },
    'core:tab_select': function onTabSelect({ url }) {
      if (!this.greenAds) return;
      if (this.greenAds.greenMode) return;

      logger.debug(`tab_select ${url}`);
      if (url.indexOf('about:') !== 0) {
        const selectedBrowser = utils.getWindow().gBrowser.selectedBrowser;
        const tabId = selectedBrowser.frameId;
        const windowTreeInformation = {
          tabId,
          parentFrameId: tabId,
          frameId: tabId,
        };
        logger.debug(`tab_select found URL ${JSON.stringify(windowTreeInformation)} ${url}`);
        this.greenAds.touchTab(windowTreeInformation, url);
      }
    },
  },

  actions: {
    /**
     * This is called everytime a process script is created
     */
    updateProcessScripts({ processId, getInventory, getMode }) {
      // Only when green-ads is enabled
      if (!greenAdsEnabled()) { return; }

      let target = 'cliqz:process-script';
      if (processId) {
        target = `${target}-${processId}`;
      }

      const data = Object.create(null);

      // Optionally update inventory
      if (getInventory && this.inventory) {
        // Get inventory
        logger.debug('Get Inventory called');
        const ads = this.inventory.getInventory();
        const tokens = this.inventory.getTokens();

        logger.debug(`>> Inventory length: ${ads.length}\n`);
        logger.debug(`>> Token length: ${Object.keys(tokens).length}\n`);

        data.inventory = {
          maxAds: 3,
          tokens,
          ads,
          index: {},
        };
      }

      // Optionally update mode
      if (getMode) {
        data.mode = getGreenadsState();
      }

      // Push the update
      this.core.action('broadcast',
        target,
        {
          action: 'updateStore',
          args: [
            {
              module: 'green-ads',
              data,
            }
          ]
        },
      );
    },

    /**
     * Keep track of page-loading performances.
     */
    onDOMCreated(windowTreeInformation, originUrl, timestamp) {
      if (this.shouldProxyAction(originUrl)) {
        events.pub(
          'greenads:start_load',
          windowTreeInformation,
          originUrl,
          timestamp,
        );

        this.greenAds.onDOMCreated(windowTreeInformation, originUrl, timestamp);
      }

      return {};
    },
    onDOMLoaded(windowTreeInformation, originUrl, timestamp) {
      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onDOMLoaded(windowTreeInformation, originUrl, timestamp);
    },
    onFullLoad(windowTreeInformation, originUrl, timestamp) {
      if (!this.shouldProxyAction(originUrl)) return;
      events.pub(
        'greenads:end_load',
        windowTreeInformation,
        originUrl,
        timestamp,
      );

      this.greenAds.onFullLoad(windowTreeInformation, originUrl, timestamp);
    },

    /**
     * Keep track of page loading events.
     */
    onNewFrame(windowTreeInformation, originUrl, timestamp, payload) {
      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onNewFrame(windowTreeInformation, originUrl, timestamp, payload);
    },

    /**
     * Keep track on activity of normal ads
     */
    // onFrameClicked(windowTreeInformation, originUrl, timestamp, sourceUrl) {
    //   // TODO - check if the corresponding iFrame contains an Ad or not
    // },

    // onFrameOver() {
    // },

    /**
     * Keep track of ad-related activity.
     * Signals used to assess the performance of ads.
     */
    adShown(windowTreeInformation, originUrl, url, timestamp) {
      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onAdShown(windowTreeInformation, originUrl, url, timestamp);
    },
    adOver(windowTreeInformation, originUrl, url, timestamp) {
      if (!this.shouldProxyAction(originUrl)) return;
      this.greenAds.onAdOver(windowTreeInformation, originUrl, url, timestamp);
    },
    adClicked(windowTreeInformation, originUrl, url, timestamp, extra, adID) {
      if (!this.shouldProxyAction(originUrl)) return;
      // TODO - push an inventory update to the process script
      this.inventory.adClicked(adID);
      this.greenAds.onAdClicked(windowTreeInformation, originUrl, url, timestamp);
    },

    highlightAd(frameId) {
      if (getGreenadsState() === GREENADS_STATE.COLLECT) {
        return this.core.action('broadcastMessageToWindow',
          { ad: true },
          frameId,
          'green-ads',
        );
      }

      return Promise.resolve();
    },

    getStats() {
      if (!this.greenAds) return {};
      return this.greenAds.aggregate();
    },

    getCosmeticsForNodes(nodes, sender) {
      const url = sender.tab.url;
      if (getGreenadsState() === GREENADS_STATE.DISABLED) {
        return { active: false };
      }

      const cosmetics = this.greenAds.adblocker.engine.getCosmeticsFilters(
        extractHostname(url),
        nodes
      );
      cosmetics.styles = [];

      return cosmetics;
    },
    getCosmeticsForDomain(url) {
      if (getGreenadsState() === GREENADS_STATE.DISABLED) {
        return { active: false };
      }

      const cosmetics = this.greenAds.adblocker.engine.getDomainFilters(
        extractHostname(url)
      );
      cosmetics.styles = [];

      return cosmetics;
    },
  },
});
