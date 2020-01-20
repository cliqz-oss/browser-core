/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-param-reassign */
import * as persist from '../core/persistent-state';
import UrlWhitelist from '../core/url-whitelist';
import console from '../core/console';
import domainInfo from '../core/services/domain-info';
import inject, { ifModuleEnabled } from '../core/kord/inject';
import pacemaker from '../core/services/pacemaker';
import { getGeneralDomain } from '../core/tlds';
import prefs from '../core/prefs';
import events from '../core/events';

import * as browser from '../platform/browser';
import * as datetime from './time';
import Pipeline from '../webrequest-pipeline/pipeline';
import QSWhitelist2 from './qs-whitelist2';
import TempSet from './temp-set';
import { truncatedHash } from '../core/helpers/md5';
import telemetry from './telemetry';
import { HashProb, shouldCheckToken } from './hash';
import { getDefaultTrackerTxtRule } from './tracker-txt';
import { parse, isPrivateIP, getName } from '../core/url';
import { VERSION, TELEMETRY, COOKIE_MODE } from './config';
import { checkInstalledPrivacyAddons } from '../platform/addon-check';
import { compressionAvailable, compressJSONToBase64 } from './compression';
import { generateAttrackPayload, shuffle } from './utils';
import buildPageLoadObject from './page-telemetry';
import AttrackDatabase from './database';
import getTrackingStatus from './dnt';
import TrackerCounter from '../core/helpers/tracker-counter';

import BlockRules from './steps/block-rules';
import CookieContext from './steps/cookie-context';
import PageLogger from './steps/page-logger';
import RedirectTagger from './steps/redirect-tagger';
import TokenChecker from './steps/token-checker';
import TokenExaminer from './steps/token-examiner';
import TokenTelemetry from './steps/token-telemetry';
import OAuthDetector from './steps/oauth-detector';
import { checkValidContext, checkSameGeneralDomain } from './steps/check-context';

export default class CliqzAttrack {
  constructor() {
    this.VERSION = VERSION;
    this.LOG_KEY = 'attrack';
    this.debug = false;
    this.msgType = 'attrack';
    this.similarAddon = false;
    this.recentlyModified = new TempSet();
    this.whitelistedRequestCache = new Set();
    this.urlWhitelist = new UrlWhitelist('attrack-url-whitelist');

    // Intervals
    this.hourChangedInterval = null;
    this.tpEventInterval = null;

    // Web request pipelines
    this.webRequestPipeline = inject.module('webrequest-pipeline');
    this.pipelineSteps = {};
    this.pipelines = {};

    this.ghosteryDomains = {};

    this.db = new AttrackDatabase();
  }

  checkIsWhitelisted(state) {
    if (this.whitelistedRequestCache.has(state.requestId)) {
      return true;
    }
    if (this.isWhitelisted(state)) {
      this.whitelistedRequestCache.add(state.requestId);
      return true;
    }
    return false;
  }

  isWhitelisted(state) {
    return state.tabUrlParts !== null && this.urlWhitelist.isWhitelisted(
      state.tabUrl,
      state.tabUrlParts.hostname,
      state.tabUrlParts.generalDomain,
    );
  }

  obfuscate(s, method) {
    // used when action != 'block'
    // default is a placeholder
    switch (method) {
      case 'empty':
        return '';
      case 'replace':
        return shuffle(s);
      case 'same':
        return s;
      case 'placeholder':
        return this.config.placeHolder;
      default:
        return this.config.placeHolder;
    }
  }

  getPrivateValues(window) {
    // creates a list of return values of functions may leak private info
    const p = {};
    const navigator = window.navigator;
    // plugins
    for (let i = 0; i < navigator.plugins.length; i += 1) {
      const name = navigator.plugins[i].name;
      if (name.length >= 8) {
        p[name] = true;
      }
    }
    this.privateValues = p;
  }

  getDefaultRule() {
    if (this.isForceBlockEnabled()) {
      return 'block';
    }

    return getDefaultTrackerTxtRule();
  }

  isEnabled() {
    return this.config.enabled;
  }

  isCookieEnabled() {
    return this.config.cookieEnabled;
  }

  isQSEnabled() {
    return this.config.qsEnabled;
  }

  isFingerprintingEnabled() {
    return this.config.fingerprintEnabled;
  }

  isReferrerEnabled() {
    return this.config.referrerEnabled;
  }

  isTrackerTxtEnabled() {
    return this.config.trackerTxtEnabled;
  }

  isBloomFilterEnabled() {
    return this.config.bloomFilterEnabled;
  }

  isForceBlockEnabled() {
    return this.config.forceBlockEnabled;
  }

  initPacemaker() {
    const twoMinutes = 2 * 60 * 1000;

    // pacemaker.register(this.updateConfig, 3 * 60 * 60 * 1000);

    // if the hour has changed
    this.hourChangedInterval = pacemaker.register(this.hourChanged.bind(this), {
      timeout: twoMinutes,
    });
  }

  telemetry({ message, raw = false, compress = false, ts = undefined }) {
    if (!message.type) {
      message.type = telemetry.msgType;
    }
    if (raw !== true) {
      message.payload = generateAttrackPayload(message.payload, ts, this.qs_whitelist.getVersion());
    }
    if (compress === true && compressionAvailable()) {
      message.compressed = true;
      message.payload = compressJSONToBase64(message.payload);
    }
    telemetry.telemetry(message);
  }

  /** Global module initialisation.
  */
  init(config, settings) {
    const initPromises = [];
    this.config = config;

    // Replace getWindow functions with window object used in init.
    if (this.debug) console.log('Init function called:', this.LOG_KEY);

    if (!this.hashProb && config.databaseEnabled) {
      this.hashProb = new HashProb();
      this.hashProb.init();
    }

    // load all caches:
    // Large dynamic caches are loaded via the persist module, which will
    // lazily propegate changes back to the browser's sqlite database.
    // Large static caches (e.g. token whitelist) are loaded from sqlite
    // Smaller caches (e.g. update timestamps) are kept in prefs

    this.qs_whitelist = new QSWhitelist2(this.config.whitelistUrl);

    // load the whitelist async - qs protection will start once it is ready
    this.qs_whitelist.init();
    // urlWhitelist is not needed on ghostery
    if (!settings || settings.channel !== 'CH80') {
      initPromises.push(this.urlWhitelist.init());
    }
    if (config.databaseEnabled) {
      initPromises.push(this.db.init());
    }

    // force clean requestKeyValue
    this.onSafekeysUpdated = events.subscribe('attrack:safekeys_updated', (version, forceClean) => {
      if (forceClean && this.pipelineSteps.tokenExaminer) {
        this.pipelineSteps.tokenExaminer.clearCache();
      }
    });

    this.checkInstalledAddons();

    this.initPacemaker();

    initPromises.push(this.initPipeline());

    return Promise.all(initPromises);
  }

  setHWTelemetryMode(enabled) {
    const mode = enabled ? TELEMETRY.TRACKERS_ONLY : TELEMETRY.DISABLED;
    if (this.config.telemetryMode === mode) {
      return Promise.resolve();
    }
    this.config.telemetryMode = mode;
    // reset pipeline to reflect new state
    return this.initPipeline();
  }

  initPipeline() {
    return this.unloadPipeline().then(() => {
      // Initialise classes which are used as steps in listeners
      const steps = {
        pageLogger: new PageLogger(this.config),
        blockRules: new BlockRules(this.config),
        cookieContext: new CookieContext(this.config, this.qs_whitelist),
        redirectTagger: new RedirectTagger(),
        oauthDetector: new OAuthDetector(),
      };
      if (this.config.databaseEnabled && this.config.telemetryMode !== TELEMETRY.DISABLED) {
        steps.tokenTelemetry = new TokenTelemetry(
          this.telemetry.bind(this),
          this.qs_whitelist,
          this.config,
          this.db,
          this.shouldCheckToken.bind(this),
          this.config.tokenTelemetry
        );
      }
      if (this.config.databaseEnabled) {
        steps.tokenExaminer = new TokenExaminer(
          this.qs_whitelist,
          this.config,
          this.db,
          this.shouldCheckToken.bind(this)
        );
        steps.tokenChecker = new TokenChecker(
          this.qs_whitelist,
          {},
          this.shouldCheckToken.bind(this),
          this.config,
          this.telemetry,
          this.db
        );
      }

      this.pipelineSteps = steps;

      // initialise step objects
      Object.keys(steps).forEach((key) => {
        const step = steps[key];
        if (step.init) {
          step.init();
        }
      });

      // ----------------------------------- \\
      // create pipeline for onBeforeRequest \\
      // ----------------------------------- \\
      this.pipelines.onBeforeRequest = new Pipeline('antitracking.onBeforeRequest', [
        {
          name: 'checkState',
          spec: 'break',
          fn: checkValidContext,
        },
        {
          name: 'oauthDetector.checkMainFrames',
          spec: 'break',
          fn: state => steps.oauthDetector.checkMainFrames(state),
        },
        {
          name: 'redirectTagger.checkRedirect',
          spec: 'break',
          fn: state => steps.redirectTagger.checkRedirect(state),
        },
        {
          name: 'checkSameGeneralDomain',
          spec: 'break',
          fn: checkSameGeneralDomain,
        },
        {
          name: 'cancelRecentlyModified',
          spec: 'blocking',
          fn: (state, response) => this.cancelRecentlyModified(state, response),
        },
        {
          name: 'pageLogger.onBeforeRequest',
          spec: 'annotate',
          fn: state => steps.pageLogger.onBeforeRequest(state),
        },
        {
          name: 'logIsTracker',
          spec: 'collect',
          fn: (state) => {
            if (this.qs_whitelist.isTrackerDomain(truncatedHash(state.urlParts.generalDomain))) {
              const annotations = state.getPageAnnotations();
              annotations.counter = annotations.counter || new TrackerCounter();
              annotations.counter.addTrackerSeen(state.ghosteryBug, state.urlParts.hostname);
            }
            if (state.ghosteryBug && this.config.cookieMode === COOKIE_MODE.GHOSTERY) {
              // track domains used by ghostery rules so that we only block cookies for these
              // domains
              this.ghosteryDomains[state.urlParts.generalDomain] = state.ghosteryBug;
            }
          },
        },
        {
          name: 'checkExternalBlocking',
          spec: 'blocking',
          fn: (state, response) => {
            if (response.cancel === true || response.redirectUrl) {
              state.incrementStat('blocked_external');
              response.shouldIncrementCounter = true;
              return false;
            }
            return true;
          },
        },
        {
          name: 'checkDatabaseEnabled',
          spec: 'break',
          // if there is no database the following steps should be skipped
          fn: () => this.config.databaseEnabled,
        },
        {
          name: 'tokenExaminer.examineTokens',
          spec: 'collect', // TODO - global state
          fn: state => steps.tokenExaminer.examineTokens(state),
        },
        {
          name: 'tokenTelemetry.extractKeyTokens',
          spec: 'collect', // TODO - global state
          fn: state => !steps.tokenTelemetry || steps.tokenTelemetry.extractKeyTokens(state),
        },
        {
          name: 'tokenChecker.findBadTokens',
          spec: 'annotate',
          fn: state => steps.tokenChecker.findBadTokens(state),
        },
        {
          name: 'checkSourceWhitelisted',
          spec: 'break',
          fn: (state) => {
            if (this.checkIsWhitelisted(state)) {
              state.incrementStat('source_whitelisted');
              return false;
            }
            return true;
          },
        },
        {
          name: 'checkShouldBlock',
          spec: 'break',
          fn: state => state.badTokens.length > 0 && this.qs_whitelist.isUpToDate()
                       && !this.config.paused,
        },
        {
          name: 'oauthDetector.checkIsOAuth',
          spec: 'break',
          fn: state => steps.oauthDetector.checkIsOAuth(state, 'token'),
        },
        {
          name: 'isQSEnabled',
          spec: 'break',
          fn: () => this.isQSEnabled(),
        },
        {
          name: 'blockRules.applyBlockRules',
          spec: 'blocking',
          fn: (state, response) => steps.blockRules.applyBlockRules(state, response),
        },
        {
          name: 'logBlockedToken',
          spec: 'collect',
          fn: (state) => {
            const annotations = state.getPageAnnotations();
            annotations.counter = annotations.counter || new TrackerCounter();
            annotations.counter.addTokenRemoved(state.ghosteryBug, state.urlParts.hostname);
          },
        },
        {
          name: 'applyBlock',
          spec: 'blocking',
          fn: (state, response) => this.applyBlock(state, response),
        },
      ]);


      // --------------------------------------- \\
      // create pipeline for onBeforeSendHeaders \\
      // --------------------------------------- \\
      this.pipelines.onBeforeSendHeaders = new Pipeline('antitracking.onBeforeSendHeaders', [
        {
          name: 'checkState',
          spec: 'break',
          fn: checkValidContext,
        },
        {
          name: 'cookieContext.assignCookieTrust',
          spec: 'collect', // TODO - global state
          fn: state => steps.cookieContext.assignCookieTrust(state),
        },
        {
          name: 'redirectTagger.confirmRedirect',
          spec: 'break',
          fn: state => steps.redirectTagger.confirmRedirect(state),
        },
        {
          name: 'checkIsMainDocument',
          spec: 'break',
          fn: state => !state.isMainFrame,
        },
        {
          name: 'checkSameGeneralDomain',
          spec: 'break',
          fn: checkSameGeneralDomain,
        },
        {
          name: 'pageLogger.onBeforeSendHeaders',
          spec: 'annotate',
          fn: state => steps.pageLogger.onBeforeSendHeaders(state),
        },
        {
          name: 'catchMissedOpenListener',
          spec: 'blocking',
          fn: (state, response) => {
            if ((state.reqLog && state.reqLog.c === 0)
                || steps.redirectTagger.isFromRedirect(state.url)) {
              // take output from 'open' pipeline and copy into our response object
              this.pipelines.onBeforeRequest.execute(state, response);
            }
          },
        },
        {
          name: 'overrideUserAgent',
          spec: 'blocking',
          fn: (state, response) => {
            if (this.config.overrideUserAgent === true) {
              const domainHash = truncatedHash(state.urlParts.generalDomain);
              if (this.qs_whitelist.isTrackerDomain(domainHash)) {
                response.modifyHeader('User-Agent', 'CLIQZ');
                state.incrementStat('override_user_agent');
              }
            }
          },
        },
        {
          name: 'checkHasCookie',
          spec: 'break',
          // hasCookie flag is set by pageLogger.onBeforeSendHeaders
          fn: state => state.hasCookie === true,
        },
        {
          name: 'checkIsCookieWhitelisted',
          spec: 'break',
          fn: state => this.checkIsCookieWhitelisted(state),
        },
        {
          name: 'checkCompatibilityList',
          spec: 'break',
          fn: state => this.checkCompatibilityList(state),
        },
        {
          name: 'checkCookieBlockingMode',
          spec: 'break',
          fn: state => this.checkCookieBlockingMode(state),
        },
        {
          name: 'cookieContext.checkCookieTrust',
          spec: 'break',
          fn: state => steps.cookieContext.checkCookieTrust(state),
        },
        {
          name: 'cookieContext.checkVisitCache',
          spec: 'break',
          fn: state => steps.cookieContext.checkVisitCache(state),
        },
        {
          name: 'cookieContext.checkContextFromEvent',
          spec: 'break',
          fn: state => steps.cookieContext.checkContextFromEvent(state),
        },
        {
          name: 'oauthDetector.checkIsOAuth',
          spec: 'break',
          fn: state => steps.oauthDetector.checkIsOAuth(state, 'cookie'),
        },
        {
          name: 'shouldBlockCookie',
          spec: 'break',
          fn: (state) => {
            const shouldBlock = !this.checkIsWhitelisted(state)
              && this.isCookieEnabled(state) && !this.config.paused;
            if (!shouldBlock) {
              state.incrementStat('bad_cookie_sent');
            }
            return shouldBlock;
          }
        },
        {
          name: 'logBlockedCookie',
          spec: 'collect',
          fn: (state) => {
            const annotations = state.getPageAnnotations();
            annotations.counter = annotations.counter || new TrackerCounter();
            annotations.counter.addCookieBlocked(state.ghosteryBug, state.urlParts.hostname);
          },
        },
        {
          name: 'blockCookie',
          spec: 'blocking',
          fn: (state, response) => {
            state.incrementStat('cookie_blocked');
            state.incrementStat('cookie_block_tp1');
            response.modifyHeader('Cookie', '');
            if (this.config.sendAntiTrackingHeader) {
              response.modifyHeader(this.config.cliqzHeader, ' ');
            }
            state.page.counter += 1;
          },
        }
      ]);


      // ------------------------------------- \\
      // create pipeline for onHeadersReceived \\
      // ------------------------------------- \\
      this.pipelines.onHeadersReceived = new Pipeline('antitracking.onHeadersReceived', [
        {
          name: 'checkState',
          spec: 'break',
          fn: checkValidContext,
        },
        {
          name: 'checkMainDocumentRedirects',
          spec: 'break',
          fn: (state) => {
            if (state.isMainFrame) {
              // check for tracking status headers for first party
              const trackingStatus = getTrackingStatus(state);
              if (trackingStatus) {
                state.page.setTrackingStatus(trackingStatus);
              }
              return false;
            }
            return true;
          },
        },
        {
          name: 'checkSameGeneralDomain',
          spec: 'break',
          fn: checkSameGeneralDomain,
        },
        {
          name: 'redirectTagger.checkRedirectStatus',
          spec: 'break',
          fn: state => steps.redirectTagger.checkRedirectStatus(state),
        },
        {
          name: 'pageLogger.onHeadersReceived',
          spec: 'annotate',
          fn: state => steps.pageLogger.onHeadersReceived(state),
        },
        {
          name: 'logResponseStats',
          spec: 'collect',
          fn: (state) => {
            if (state.incrementStat) {
              // TSV stats
              if (this.qs_whitelist.isTrackerDomain(truncatedHash(state.urlParts.generalDomain))) {
                const trackingStatus = getTrackingStatus(state);
                if (trackingStatus) {
                  state.incrementStat(`tsv_${trackingStatus.value}`);
                  if (trackingStatus.statusId) {
                    state.incrementStat('tsv_status');
                  }
                }
              }
            }
          },
        },
        {
          name: 'checkSetCookie',
          spec: 'break',
          fn: state => state.hasSetCookie === true,
        },
        {
          name: 'shouldBlockCookie',
          spec: 'break',
          fn: state => !this.checkIsWhitelisted(state)
            && this.isCookieEnabled(state),
        },
        {
          name: 'checkIsCookieWhitelisted',
          spec: 'break',
          fn: state => this.checkIsCookieWhitelisted(state),
        },
        {
          name: 'checkCompatibilityList',
          spec: 'break',
          fn: state => this.checkCompatibilityList(state),
        },
        {
          name: 'checkCookieBlockingMode',
          spec: 'break',
          fn: state => this.checkCookieBlockingMode(state),
        },
        {
          name: 'cookieContext.checkCookieTrust',
          spec: 'break',
          fn: state => steps.cookieContext.checkCookieTrust(state),
        },
        {
          name: 'cookieContext.checkVisitCache',
          spec: 'break',
          fn: state => steps.cookieContext.checkVisitCache(state),
        },
        {
          name: 'cookieContext.checkContextFromEvent',
          spec: 'break',
          fn: state => steps.cookieContext.checkContextFromEvent(state),
        },
        {
          name: 'logSetBlockedCookie',
          spec: 'collect',
          fn: (state) => {
            const annotations = state.getPageAnnotations();
            annotations.counter = annotations.counter || new TrackerCounter();
            annotations.counter.addCookieBlocked(state.ghosteryBug, state.urlParts.hostname);
          },
        },
        {
          name: 'blockSetCookie',
          spec: 'blocking',
          fn: (state, response) => {
            response.modifyResponseHeader('Set-Cookie', '');
            state.incrementStat('set_cookie_blocked');
            state.page.counter += 1;
          },
        },
      ]);

      this.pipelines.onCompleted = new Pipeline('antitracking.onCompleted', [
        {
          name: 'checkState',
          spec: 'break',
          fn: checkValidContext,
        },
        {
          name: 'logPrivateDocument',
          spec: 'break',
          fn: (state) => {
            if (state.isMainFrame && state.ip) {
              if (isPrivateIP(state.ip)) {
                state.page.isPrivateServer = true;
              }
              return false;
            }
            return true;
          }
        },
        {
          name: 'pageLogger.reattachStatCounter',
          spec: 'annotate',
          fn: state => steps.pageLogger.reattachStatCounter(state),
        },
        {
          name: 'logIsCached',
          spec: 'collect',
          fn: (state) => {
            this.whitelistedRequestCache.delete(state.requestId);
            state.incrementStat(state.fromCache ? 'cached' : 'not_cached');
          }
        }
      ]);

      this.pipelines.onErrorOccurred = new Pipeline('antitracking.onError', [
        {
          name: 'checkState',
          spec: 'break',
          fn: checkValidContext,
        },
        {
          name: 'pageLogger.reattachStatCounter',
          spec: 'annotate',
          fn: state => steps.pageLogger.reattachStatCounter(state),
        }, {
          name: 'logError',
          spec: 'collect',
          fn: (state) => {
            this.whitelistedRequestCache.delete(state.requestId);
            if (state.error && state.error.indexOf('ABORT')) {
              state.incrementStat('error_abort');
            }
          }
        }
      ]);

      // Add steps to the global web request pipeline
      return Promise.all(Object.keys(this.pipelines).map(stage =>
        this.webRequestPipeline.action(
          'addPipelineStep',
          stage,
          {
            name: `antitracking.${stage}`,
            spec: 'blocking',
            fn: (...args) => this.pipelines[stage].execute(...args),
          }
        )));
    });
  }

  unloadPipeline() {
    Object.keys(this.pipelineSteps || {}).forEach((key) => {
      const step = this.pipelineSteps[key];
      if (step.unload) {
        step.unload();
      }
    });

    Object.keys(this.pipelines).forEach((stage) => {
      this.pipelines[stage].unload();
    });

    // Remove steps to the global web request pipeline
    // NOTE: this is async but the result can be ignored when the extension is
    // unloaded. This is because the background from webrequest-pipeline has
    // a synchronous `unload` method which will clean up everything anyway.
    // But if we reload only the antitracking module, we need to be sure we
    // removed the steps before we try to add them again.
    return Promise.all(
      Object.keys(this.pipelines).map(
        stage => ifModuleEnabled(
          this.webRequestPipeline.action(
            'removePipelineStep',
            stage,
            `antitracking.${stage}`
          )
        )
      )
    ).then(() => {
      this.pipelines = {};
    });
  }

  /** Per-window module initialisation
  */
  initWindow(window) {
    this.getPrivateValues(window);
  }

  unload() {
    // Check is active usage, was sent
    this.hashProb.unload();
    this.qs_whitelist.destroy();

    this.unloadPipeline();

    this.db.unload();

    this.onSafekeysUpdated.unsubscribe();

    pacemaker.clearTimeout(this.hourChangedInterval);
    this.hourChangedInterval = null;

    pacemaker.clearTimeout(this.tpEventInterval);
    this.tpEventInterval = null;
  }

  checkInstalledAddons() {
    checkInstalledPrivacyAddons().then((adds) => {
      this.similarAddon = adds;
    }).catch(() => {
      // rejection expected on platforms which do not support addon check
    });
  }

  hourChanged() {
    const name = 'hourChanged';
    const fidelity = 10; // hour

    const timestamp = datetime.getTime().slice(0, fidelity);
    const lastHour = persist.getValue(`${name}lastRun`) || timestamp;
    persist.setValue(`${name}lastRun`, timestamp);

    if (timestamp === lastHour) {
      return;
    }

    // trigger other hourly events
    events.pub('attrack:hour_changed');
  }

  isInWhitelist(domain) {
    if (!this.config.cookieWhitelist) return false;
    const keys = this.config.cookieWhitelist;
    for (let i = 0; i < keys.length; i += 1) {
      const ind = domain.indexOf(keys[i]);
      if (ind >= 0) {
        if ((ind + keys[i].length) === domain.length) return true;
      }
    }
    return false;
  }

  cancelRecentlyModified(state, response) {
    const sourceTab = state.tabId;
    const url = state.url;
    if (this.recentlyModified.contains(sourceTab + url)) {
      this.recentlyModified.delete(sourceTab + url);
      response.block();
      return false;
    }
    return true;
  }

  applyBlock(state, _response) {
    const response = _response;
    const badTokens = state.badTokens;
    const rule = this.getDefaultRule();

    if (this.debug) {
      console.log('ATTRACK', rule, 'URL:', state.urlParts.hostname, state.urlParts.pathname, 'TOKENS:', badTokens);
    }

    if (rule === 'block') {
      state.incrementStat(`token_blocked_${rule}`);
      response.block();
      response.shouldIncrementCounter = true;
      return false;
    }

    let tmpUrl = state.url;
    for (let i = 0; i < badTokens.length; i += 1) {
      tmpUrl = tmpUrl.replace(badTokens[i], this.obfuscate(badTokens[i], rule));
    }
    // In case unsafe tokens were in the hostname, the URI is not valid
    // anymore and we can cancel the request.
    if (!tmpUrl.startsWith(state.urlParts.origin)) {
      response.block();
      return false;
    }

    state.incrementStat(`token_blocked_${rule}`);

    // TODO: do this nicer
    // if (this.pipelineSteps.trackerProxy && this.pipelineSteps.trackerProxy.shouldProxy(tmpUrl)) {
    //     state.incrementStat('proxy');
    // }
    this.recentlyModified.add(state.tabId + state.url, 30000);

    response.redirectTo(tmpUrl);
    response.modifyHeader(this.config.cliqzHeader, ' ');

    state.page.counter += 1;
    return true;
  }

  checkIsCookieWhitelisted(state) {
    if (this.isInWhitelist(state.urlParts.hostname)) {
      const stage = state.statusCode !== undefined ? 'set_cookie' : 'cookie';
      state.incrementStat(`${stage}_allow_whitelisted`);
      return false;
    }
    return true;
  }

  checkCompatibilityList(state) {
    const tpGd = state.urlParts.generalDomain;
    const fpGd = state.tabUrlParts.generalDomain;
    if (this.config.compabilityList
        && this.config.compatibilityList[tpGd]
        && this.config.compatibilityList[tpGd].indexOf(fpGd) !== -1) {
      return false;
    }
    return true;
  }

  checkCookieBlockingMode(state) {
    const mode = this.config.cookieMode;
    if (mode === COOKIE_MODE.TRACKERS
        && !this.qs_whitelist.isTrackerDomain(truncatedHash(state.urlParts.generalDomain))) {
      state.incrementStat('cookie_allow_nottracker');
      return false;
    }
    if (
      mode === COOKIE_MODE.GHOSTERY
      && !this.ghosteryDomains[state.urlParts.generalDomain]
      && getName(state.urlParts) !== 'google'
    ) {
      // in Ghostery mode: if the domain did not match a ghostery bug we allow it. One exception
      // are third-party google.tld cookies, which we do not allow with this mechanism.
      state.incrementStat('cookie_allow_ghostery');
      return false;
    }
    return true;
  }

  /** Get info about trackers and blocking done in a specified tab.
   *
   *  Returns an object describing anti-tracking actions for this page, with keys as follows:
   *    cookies: 'allowed' and 'blocked' counts.
   *    requests: 'safe' and 'unsafe' counts. 'Unsafe' means that unsafe data
   *      was seen in a request to a tracker.
   *    trackers: more detailed information about each tracker. Object with
   *      keys being tracker domain and values more detailed blocking data.
   */
  async getTabBlockingInfo(tabId, url) {
    const result = {
      url,
      tab: tabId,
      hostname: '',
      path: '',
      cookies: { allowed: 0, blocked: 0 },
      requests: { safe: 0, unsafe: 0 },
      trackers: {},
      companies: {},
      companyInfo: {},
      ps: null
    };

    // ignore special tabs
    if (url && (url.startsWith('about')
                || url.startsWith('chrome')
                || url.startsWith('resource'))) {
      result.error = 'Special tab';
      return Promise.resolve(result);
    }

    const page = await this.webRequestPipeline.action('getPageForTab', tabId);

    if (!page) {
      // no tp event, but 'active' tab = must reload for data
      // otherwise -> system tab
      return browser.checkIsWindowActive(tabId)
        .then((active) => {
          if (active) {
            result.reload = true;
          }

          result.error = 'No Data';
          return result;
        });
    }

    const trackers = [...page.requestStats.entries()].filter(([domain, data]) =>
      this.qs_whitelist.isTrackerDomain(truncatedHash(getGeneralDomain(domain)))
      || data.blocked_blocklist > 0).map(pair => pair[0]);

    // const firstPartyCompany = domainInfo.domainOwners[getGeneralDomain(tabData.hostname)];
    const urlInfo = parse(page.url);
    result.hostname = urlInfo.hostname;
    result.path = urlInfo.path;

    trackers.forEach((dom) => {
      result.trackers[dom] = {};
      ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs', 'set_cookie_blocked', 'blocked_blocklist'].forEach((k) => {
        result.trackers[dom][k] = page.requestStats.get(dom)[k] || 0;
      });

      // actual block count can be in several different signals, depending on
      // configuration. Aggregate them into one.
      result.trackers[dom].tokens_removed = ['empty', 'replace', 'placeholder', 'block'].reduce(
        (cumsum, action) => cumsum + (page.requestStats.get(dom)[`token_blocked_${action}`] || 0), 0
      );
      result.trackers[dom].tokens_removed += page.requestStats.get(dom).blocked_blocklist || 0;

      result.cookies.allowed += (
        result.trackers[dom].cookie_set - result.trackers[dom].cookie_blocked
      );
      result.cookies.blocked += (
        result.trackers[dom].cookie_blocked + result.trackers[dom].set_cookie_blocked
      );
      result.requests.safe += result.trackers[dom].c - result.trackers[dom].tokens_removed;
      result.requests.unsafe += result.trackers[dom].tokens_removed;

      // add set cookie blocks to cookie blocked count
      result.trackers[dom].cookie_blocked += result.trackers[dom].set_cookie_blocked;

      const company = domainInfo.getDomainOwner(dom);
      result.companyInfo[company.name] = company;

      if (!(company.name in result.companies)) {
        result.companies[company.name] = [];
      }
      result.companies[company.name].push(dom);
    });

    return Promise.resolve(result);
  }

  getCurrentTabBlockingInfo(window) {
    return browser.getActiveTab(window)
      .then(({ id, url }) => this.getTabBlockingInfo(id, url));
  }

  getTrackerListForTab(tabId) {
    return this.getTabBlockingInfo(tabId).then((info) => {
      const revComp = {};
      Object.keys(info.companies).forEach((comp) => {
        info.companies[comp].forEach((domain) => {
          revComp[domain] = comp;
        });
      });
      return Object.keys(info.trackers).map((domain) => {
        const name = revComp[domain] || getGeneralDomain(domain);
        const count = info.trackers[domain].tokens_removed || 0;
        return { name, count };
      }).reduce((acc, val) => {
        acc[val.name] = (acc[val.name] || 0) + val.count;
        return acc;
      }, {});
    });
  }

  /** Enables Attrack module with cookie, QS and referrer protection enabled.
   *  if module_only is set to true, will not set preferences for cookie, QS
   *  and referrer protection (for selective loading in AB tests)
   */
  enableModule() {
    if (this.isEnabled()) {
      return;
    }

    this.config.setPref('enabled', true);
  }

  /** Disables anti-tracking immediately.
  */
  disableModule() {
    prefs.set(this.config.PREFS.enabled, false);
  }

  logWhitelist(payload) {
    this.telemetry({
      message: {
        type: telemetry.msgType,
        action: 'attrack.whitelistDomain',
        payload
      },
      raw: true,
    });
  }

  clearCache() {
    if (this.pipelineSteps.tokenExaminer) {
      this.pipelineSteps.tokenExaminer.clearCache();
    }
    if (this.pipelineSteps.tokenChecker) {
      this.pipelineSteps.tokenChecker.tokenDomain.clear();
    }
  }

  shouldCheckToken(tok) {
    return shouldCheckToken(this.hashProb, this.config.shortTokenLength, tok);
  }

  onPageStaged(page) {
    if (this.config.telemetryMode !== TELEMETRY.DISABLED
        && page.state === 'complete'
        && !page.isPrivate
        && !page.isPrivateServer) {
      const payload = buildPageLoadObject(page);
      if (payload.scheme.startsWith('http') && Object.keys(payload.tps).length > 0) {
        const wrappedPayload = generateAttrackPayload([payload], undefined, {
          conf: {},
          addons: this.similarAddon,
        });
        this.telemetry({
          message: {
            type: telemetry.msgType,
            action: 'attrack.tp_events',
            payload: wrappedPayload
          },
          raw: true,
        });
      }
    }
  }
}
