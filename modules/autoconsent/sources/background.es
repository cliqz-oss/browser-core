/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import AutoConsent from '@cliqz/autoconsent';
import background from '../core/base/background';
import tabs from '../platform/tabs';
import { browser } from '../platform/globals';
import Logger from '../core/logger';
import { parse } from '../core/url';
import prefs from '../core/prefs';
import inject from '../core/kord/inject';
import config from '../core/config';
import { fetch } from '../core/http';
import pacemaker from '../core/services/pacemaker';

import ConsentSettings from './settings';
import { setOnboardingWasCompleted, setOnboardingWasDeferred, shouldShowOnboardingPopup, onBoardingWasDismissed } from './onboarding';
import Cosmetics from './cosmetics';
import Telemetry from './telemetry';

// Telemetry schemas
import metrics from './telemetry/metrics';
import analyses from './telemetry/analyses';

const tabGuards = new Set();

const DISABLED_CMPS_URL = `${config.settings.CDN_BASEURL}/autoconsent/disabled_cmps.json`;

export const POPUP_ACTIONS = {
  ASK: 'ask',
  ALLOW: 'allow',
  DENY: 'deny',
  NONE: 'none',
};

const CONSENT_STATES = {
  NOT_SET: 'not set',
  ALL_ALLOWED: 'all allowed',
  ALL_DENIED: 'all denied',
  CUSTOM: 'custom',
  HIDDEN: 'hidden',
};

class TabConsent {
  constructor(url, cmp, settings, telemetry) {
    this.url = url;
    this.cmp = cmp;
    this.tab = cmp.tab;
    this.settings = settings;
    this.telemetry = telemetry;
  }

  async actionOnPopup() {
    // check settings for this site and global settings
    return this.settings.getActionOnPopup(this.url.hostname) || POPUP_ACTIONS.ASK;
  }

  async getConsentStatus() {
    return this.settings.getStatusForSite(this.url.hostname);
  }

  setConsentStatus(state) {
    this.settings.setSiteConsentStatus(this.url.hostname, state);
  }

  saveActionPreference(when, action) {
    if (when === 'always') {
      return this.settings.setActionPreferenceDefault(action);
    }
    if (when === 'site') {
      return this.settings.setActionPreferenceSite(this.url.hostname, action);
    }
    return Promise.resolve();
  }

  async allow(when) {
    const tStart = Date.now();
    try {
      tabGuards.add(this.tab.id);
      await this.cmp.doOptIn(this.tab);
      this.setConsentStatus(CONSENT_STATES.ALL_ALLOWED);
    } catch (e) {
      this.telemetry.recordConsentError(this.cmp, e.toString());
    } finally {
      tabGuards.delete(this.tab.id);
    }
    this.telemetry.recordConsentTime(this.cmp, 'allow', Date.now() - tStart);
    this.saveActionPreference(when, POPUP_ACTIONS.ALLOW);
  }

  async deny(when) {
    const tStart = Date.now();
    try {
      tabGuards.add(this.tab.id);
      await this.cmp.doOptOut(this.tab);
      this.setConsentStatus(CONSENT_STATES.ALL_DENIED);
    } catch (e) {
      this.telemetry.recordConsentError(this.cmp, 'deny', e.toString());
    } finally {
      tabGuards.delete(this.tab.id);
    }
    this.telemetry.recordConsentTime(this.cmp, 'deny', Date.now() - tStart);
    this.saveActionPreference(when, POPUP_ACTIONS.DENY);
  }
}

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  requiresServices: ['telemetry', 'pacemaker'],
  core: inject.module('core'),
  telemetrySchemas: [
    ...metrics,
    ...analyses,
  ],

  /**
    @method init
    @param settings
  */
  init() {
    inject.service('telemetry', ['register']).register(this.telemetrySchemas);

    this.logger = Logger.get('autoconsent', { level: 'log' });
    this.autoconsent = new AutoConsent((tabId, msg, { frameId }) =>
      this.core.action('callContentAction', 'autoconsent', 'dispatchAutoconsentMessage', {
        windowId: tabId,
        frameId
      }, msg).catch(() => false));
    this.settings = new ConsentSettings();
    this.tabConsentManagers = new Map();
    this.cosmetics = new Cosmetics(this.settings);
    this.telemetry = new Telemetry();
    this.disabledCmps = [];
    this.lastAction = null;

    this.fetchDisabledCmps();
    pacemaker.everyHour(this.fetchDisabledCmps.bind(this));

    this.onTabUpdated = async (tabId, changeInfo, tabInfo) => {
      if (changeInfo.status === 'complete' && !tabGuards.has(tabId)) {
        this.logger.info('check tab');
        const url = parse(tabInfo.url);
        if (!url || !url.protocol.startsWith('http')) {
          return;
        }
        const host = url.hostname;
        try {
          const cmp = await this.autoconsent.checkTab(tabId);
          // run any site specific cosmetics now
          const cosmeticsEnabled = ['allow', 'deny'].indexOf(await this.settings.getActionOnPopup(url.hostname)) !== -1;
          const applySiteCosmetics = cosmeticsEnabled
            ? this.cosmetics.applySiteSpecificCosmetics(cmp) : Promise.resolve([]);

          // wait for check to complete
          await cmp.checked;
          this.logger.log(cmp);
          const hasCmp = cmp.getCMPName() !== null
            && this.disabledCmps.indexOf(cmp.getCMPName()) === -1;
          if (hasCmp) {
            const tabStatus = new TabConsent(url, cmp, this.settings, this.telemetry);
            this.tabConsentManagers.set(tabId, tabStatus);

            const popupOpen = await cmp.isPopupOpen();
            this.telemetry.recordCMPDetected(cmp, popupOpen);

            if (popupOpen) {
              this.logger.log('Popup is open', cmp.getCMPName(), tabId, host);
              // check for repeated action - did we already try to opt-in/out on this site in the
              // last minute? If so, temporarily disable autoconsent on this site.
              if (this.lastAction && this.lastAction.s === host
                  && this.lastAction.tab === tabId
                  && Date.now() - this.lastAction.t < 60000) {
                this.actions.setSiteAction(host, 'none', true);
                return;
              }
              switch (await tabStatus.actionOnPopup()) {
                case POPUP_ACTIONS.ALLOW:
                  this.logger.log('doing opt in', host);
                  await tabStatus.allow();
                  break;
                case POPUP_ACTIONS.DENY:
                  this.logger.log('doing opt out', host);
                  await tabStatus.deny();
                  this.lastAction = {
                    t: Date.now(),
                    s: host,
                    tab: tabId,
                  };
                  break;
                case POPUP_ACTIONS.NONE:
                  break;
                case POPUP_ACTIONS.ASK:
                default:
                  if (shouldShowOnboardingPopup()) {
                    this.showConsentModal(tabId);
                  }
              }
              return;
            }
          }
          // cosmetics enabled
          if (cosmeticsEnabled) {
            const cosmeticMatches = [
              ...await applySiteCosmetics,
              ...await this.cosmetics.applyCosmetics(cmp),
            ];
            if (cosmeticMatches.length > 0) {
              this.logger.info('cosmetic matches', cosmeticMatches);
              this.telemetry.recordCosmeticMatches(cmp, cosmeticMatches);
              return;
            }
          }

          // no cmp on this page
          if (!hasCmp && this.tabConsentManagers.has(tabId)
            && this.tabConsentManagers.get(tabId).url.hostname !== host) {
            this.tabConsentManagers.delete(tabId);
          }
        } catch (e) {
          this.logger.error(e);
        }
      }
    };
    this.onTabRemoved = (tabId) => {
      this.autoconsent.removeTab(tabId);
      this.tabConsentManagers.delete(tabId);
    };
    this.onFrameLoaded = this.autoconsent.onFrame.bind(this.autoconsent);

    tabs.onUpdated.addListener(this.onTabUpdated);
    tabs.onRemoved.addListener(this.onTabRemoved);
    chrome.webNavigation.onDOMContentLoaded.addListener(this.onFrameLoaded, {
      url: [{ schemes: ['http', 'https'] }]
    });

    return this.cosmetics.init();
  },

  unload() {
    inject.service('telemetry', ['unregister']).unregister(this.telemetrySchemas);
    if (this.onTabRemoved || this.onTabUpdated) {
      tabs.onUpdated.removeListener(this.onTabUpdated);
      tabs.onRemoved.removeListener(this.onTabRemoved);
      chrome.webNavigation.onDOMContentLoaded.removeListener(this.onFrameLoaded);
    }
    this.tabConsentManagers = null;
  },

  async currentWindowStatus({ id }) {
    if (!this.tabConsentManagers) {
      return this.status();
    }
    const status = await this.actions.getTabConsentStatus(id);
    const isWhitelisted = status.setting === POPUP_ACTIONS.NONE;
    const enabled = prefs.get('modules.autoconsent.enabled', true)
      && !isWhitelisted
      && status.defaultSetting !== undefined;
    let s;

    if (enabled) {
      s = 'active';
    } else if (isWhitelisted) {
      s = 'inactive';
    } else {
      s = 'critical';
    }

    return {
      visible: true,
      enabled,
      isWhitelisted: isWhitelisted || enabled,
      state: s,
      defaultDeny: status.defaultSetting === POPUP_ACTIONS.DENY,
      defaultAllow: status.defaultSetting === POPUP_ACTIONS.ALLOW,
      ...status,
    };
  },

  status() {
    const enabled = prefs.get('modules.autoconsent.enabled', true);
    return {
      visible: true,
      enabled,
      state: enabled ? 'active' : 'critical',
    };
  },

  showConsentModal(tabId) {
    return this.core.action('callContentAction', 'autoconsent', 'showModal', { windowId: tabId });
  },

  async fetchDisabledCmps() {
    try {
      this.disabledCmps = await (await fetch(DISABLED_CMPS_URL)).json();
    } catch (e) {
      this.disabledCmps = [];
    }
  },

  events: {},

  actions: {
    async setConsent(_action, when, { tab }) {
      const tabStatus = this.tabConsentManagers.get(tab.id);
      try {
        const action = _action === 'default'
          ? (await this.settings.getDefaultActionOnPopup()) || POPUP_ACTIONS.DENY
          : _action;
        if (action === 'allow') {
          this.logger.log('doing opt in', tabStatus.url.hostname);
          await tabStatus.allow(when);
        } else if (action === 'deny') {
          this.logger.log('doing opt out', tabStatus.url.hostname);
          await tabStatus.deny(when);
        } else if (action === 'custom') {
          tabStatus.setConsentStatus(CONSENT_STATES.CUSTOM);
        }
      } catch (e) {
        this.logger.error('problem with consent', e);
      } finally {
        this.logger.info('hide prompt');
        chrome.tabs.sendMessage(tab.id, {
          type: 'prompt',
          action: 'hide',
        });
      }
      this.cosmetics.reload();
    },

    async setDefaultAction(action) {
      await this.settings.setActionPreferenceDefault(action);
      this.cosmetics.reload();
    },

    async setSiteAction(site, action, temporary) {
      await this.settings.setActionPreferenceSite(site, action, temporary);
      this.cosmetics.reload();
    },

    async clearSiteAction(site) {
      await this.settings.clearActionPreferenceSite(site);
      this.cosmetics.reload();
    },

    async getTabConsentStatus(tabId) {
      const tabStatus = this.tabConsentManagers.get(tabId);
      if (tabStatus) {
        return {
          cmp: tabStatus.cmp.rule.name,
          status: await tabStatus.getConsentStatus(),
          setting: await this.settings.getActionOnPopup(tabStatus.url.hostname),
          defaultSetting: await this.settings.getDefaultActionOnPopup(),
        };
      }
      const tab = await browser.tabs.get(tabId);
      const url = parse(tab.url);
      return {
        status: await this.settings.getStatusForSite(url.hostname),
        setting: await this.settings.getActionOnPopup(url.hostname),
        defaultSetting: await this.settings.getDefaultActionOnPopup(),
      };
    },

    setOnboardingWasCompleted() {
      setOnboardingWasCompleted();
    },

    setOnboardingWasDeferred() {
      const newStatus = setOnboardingWasDeferred();
      this.logger.info('Defered onboarding', newStatus);
    },

    setOnboardingWasClosed(method) {
      onBoardingWasDismissed(method);
    },
  },
});
