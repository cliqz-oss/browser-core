import background from '../core/base/background';
import { utils } from '../core/cliqz';
import events from '../core/events';
import inject from '../core/kord/inject';
import { promiseHttpHandler } from '../core/http';

import GreenAds from './green-ads';
import logger from './logger';
import Inventory from './inventory';


// The green ad module can be in different states:
export const GREENADS_PREF = 'greenads';
export const GREENADS_STATE = {
  DISABLED: 'disabled', // We don't record anything
  COLLECT: 'collect',   // We record normal page behavior (no blocking or ad injection)
  GREEN: 'green',       // We record green mode (blocking of ads + injection of cached)
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


export default background({
  antitracking: inject.module('antitracking'),
  core: inject.module('core'),

  enabled() { return greenAdsEnabled(); },

  init() {
    if (this.enabled()) {
      logger.log(`init background (state: ${getGreenadsState()})`);
      // TODO - get info about adblocker and antitracking in a reliable way
      this.greenAds = new GreenAds(
        getGreenadsState() === GREENADS_STATE.GREEN,  /* is in green mode? */
        () => false,                                  /* adblocker enabled? */
        () => false,                                  /* antitracking enabled? */
        this.antitracking,                            /* give proxy to antitracking */
        this.sendTelemetry.bind(this),
      );

      this.inventory = new Inventory();

      // When a new version of the inventory is available, broadcast it to all
      // process scripts.
      this.inventory.onUpdate(() => {
        this.actions.updateProcessScripts({
          getInventory: true,
        });
      });

      return this.greenAds.init();
    }

    return Promise.resolve();
  },

  unload() {
    if (this.greenAds) {
      const unloadAdBlocker = !greenAdsEnabled();
      this.greenAds.unload(unloadAdBlocker);
      this.greenAds = undefined;
    }

    if (this.inventory) {
      this.inventory.unload();
      this.inventory = undefined;
    }
  },

  shouldProxyAction(url) {
    if (this.greenAds === undefined) {
      return false;
    }

    return this.greenAds.shouldProceedWithUrl(url);
  },

  sendTelemetry(message) {
    // delay push by 20s to not interfer with current activity
    utils.setTimeout(() => {
      promiseHttpHandler('POST', TELEMETRY_ENDPOINT,
        JSON.stringify(message), 10000, true);
    }, 20000);
  },

  events: {
    /**
     * Monitor preference changes in about:config and check if we should
     * enable or disable this module.
     */
    prefchange(pref) {
      if (pref === 'cliqz-adb' || pref === GREENADS_PREF) {
        if (!greenAdsEnabled()) {
          this.unload();
        } else if (!this.greenAds) {
          this.init();
        } else {
          this.greenAds.toggle(getGreenadsState() === GREENADS_STATE.GREEN);
        }

        // Broadcast new mode to all processes
        this.actions.updateProcessScripts({
          getMode: true,
        });
      }
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
        const tabId = selectedBrowser.outerWindowID;
        const windowTreeInformation = {
          outerWindowID: tabId,
          originWindowID: tabId,
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
      if (!this.greenAds || !this.inventory) return;

      let target = 'cliqz:process-script';
      if (processId) {
        target = `${target}-${processId}`;
      }

      // Optionally update inventory
      let inventory;
      if (getInventory) {
        // Get inventory
        logger.debug('Get Inventory called');
        const ads = this.inventory.getInventory();
        const tokens = this.inventory.getTokens();

        logger.debug(`>> Inventory length: ${ads.length}\n`);
        logger.debug(`>> Token length: ${Object.keys(tokens).length}\n`);

        inventory = {
          maxAds: 3,
          tokens,
          ads,
          index: {},
        };
      }

      // Optionally update mode
      let mode;
      if (getMode) {
        mode = getGreenadsState();
      }

      // Push the update
      this.core.action('broadcast',
        target,
        {
          mode,
          inventory,
        },
      );
    },

    /**
     * Keep track of page-loading performances.
     */
    onDOMCreated(windowTreeInformation, originUrl, timestamp) {
      if (this.shouldProxyAction(originUrl)) {
        events.pub(
          'chip:start_load',
          windowTreeInformation,
          originUrl,
          timestamp,
        );

        this.greenAds.onDOMCreated(windowTreeInformation, originUrl, timestamp);

        // Trigger adblocker injection
        return this.actions.url(originUrl);
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
        'chip:end_load',
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

    highlightAd(outerWindowID) {
      if (getGreenadsState() === GREENADS_STATE.COLLECT) {
        return this.core.action('broadcastMessageToWindow',
          { ping: true },
          outerWindowID,
          'green-ads',
        );
      }

      return Promise.resolve();
    },

    getStats() {
      if (!this.greenAds) return {};
      return this.greenAds.aggregate();
    },

    // TODO - find a better way, since this is copy/paste from
    // adblocker/background.es
    //
    // Mimic adblocker's actions
    // handles messages coming from process script
    url(url) {
      if (getGreenadsState() !== GREENADS_STATE.GREEN) {
        return {
          scripts: [],
          scriptBlock: [],
          type: 'domain-rules',
          active: false,
        };
      }

      const candidates = this.greenAds.adblocker.engine.getDomainFilters(url);
      return {
        scripts: candidates.filter(rule => rule.scriptInject).map(rule => rule.selector),
        scriptBlock: candidates.filter(rule => rule.scriptBlock).map(rule => rule.selector),
        type: 'domain-rules',
        active: true,
      };
    },
  },
});
