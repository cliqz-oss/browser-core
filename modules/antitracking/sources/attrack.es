/* eslint-disable no-param-reassign */

/*
 * This module prevents user from 3rd party tracking
 */
import { utils, events } from '../core/cliqz';
import inject, { ModuleDisabledError } from '../core/kord/inject';

import * as browser from '../platform/browser';
import * as datetime from './time';
import * as persist from './persistent-state';
import PageEventTracker from './tp_events';
import Pipeline from '../webrequest-pipeline/pipeline';
import QSWhitelist from './qs-whitelists';
import TempSet from './temp-set';
import cleanLegacyDb from './legacy/database';
import md5 from './md5';
import pacemaker from './pacemaker';
import telemetry from './telemetry';
import { AttrackBloomFilter } from './bloom-filter';
import { HashProb } from './hash';
import { TrackerTXT, getDefaultTrackerTxtRule } from './tracker-txt';
import { URLInfo, shuffle } from './url';
import { VERSION, MIN_BROWSER_VERSION } from './config';
import console from '../core/console';
import domainInfo, { getDomainOwner, getBugOwner } from '../core/domain-info';
import { checkInstalledPrivacyAddons } from '../platform/addon-check';
import { compressionAvailable, compressJSONToBase64, generateAttrackPayload } from './utils';
import { getGeneralDomain } from './domain';

import BlockRules from './steps/block-rules';
import CookieContext from './steps/cookie-context';
import DomChecker from './steps/dom-checker';
import PageLogger from './steps/page-logger';
import RedirectTagger from './steps/redirect-tagger';
import SubdomainChecker from './steps/subdomain-check';
import TokenChecker from './steps/token-checker';
import TokenExaminer from './steps/token-examiner';
import TokenTelemetry from './steps/token-telemetry';
import { skipInternalProtocols, checkSameGeneralDomain } from './steps/check-context';


export default class CliqzAttrack {
  constructor() {
    this.VERSION = VERSION;
    this.MIN_BROWSER_VERSION = MIN_BROWSER_VERSION;
    this.LOG_KEY = 'attrack';
    this.debug = false;
    this.msgType = 'attrack';
    this.similarAddon = false;
    this.tp_events = null;
    this.recentlyModified = new TempSet();
    this.disabled_sites = new Set();
    this.DISABLED_SITES_PREF = 'attrackSourceDomainWhitelist';

    // Web request pipelines
    this.webRequestPipeline = inject.module('webrequest-pipeline');
    this.pipelineSteps = {};
    this.pipelines = {};
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
    // var navigator = utils.getWindow().navigator;
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

  isCookieEnabled(sourceHostname) {
    if (sourceHostname !== undefined && this.isSourceWhitelisted(sourceHostname)) {
      return false;
    }
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

    // create a constraint which returns true when the time changes at the specified fidelity
    const timeChangeConstraint = (name, fidelity) => {
      if (fidelity === 'day') fidelity = 8;
      else if (fidelity === 'hour') fidelity = 10;
      return () => {
        const timestamp = datetime.getTime().slice(0, fidelity);
        const lastHour = persist.getValue(`${name}lastRun`) || timestamp;
        persist.setValue(`${name}lastRun`, timestamp);
        return timestamp !== lastHour;
      };
    };

    // pacemaker.register(this.updateConfig, 3 * 60 * 60 * 1000);

    // if the hour has changed
    pacemaker.register(
      this.hourChanged.bind(this),
      twoMinutes,
      timeChangeConstraint('hourChanged', 'hour'));

    pacemaker.register(() => {
      this.tp_events.commit();
      this.tp_events.push();
    }, twoMinutes);
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
  init(config) {
    this.config = config;
    // disable for older browsers
    if (browser.getBrowserMajorVersion() < this.MIN_BROWSER_VERSION) {
      return Promise.resolve();
    }

    // Replace getWindow functions with window object used in init.
    if (this.debug) console.log('Init function called:', this.LOG_KEY);

    if (!this.hashProb) {
      this.hashProb = new HashProb();
    }

    // load all caches:
    // Large dynamic caches are loaded via the persist module, which will
    // lazily propegate changes back to the browser's sqlite database.
    // Large static caches (e.g. token whitelist) are loaded from sqlite
    // Smaller caches (e.g. update timestamps) are kept in prefs

    this.qs_whitelist = this.isBloomFilterEnabled() ? new AttrackBloomFilter() : new QSWhitelist();
    const initPromises = [];
    initPromises.push(this.qs_whitelist.init());

    // force clean requestKeyValue
    events.sub('attrack:safekeys_updated', (version, forceClean) => {
      if (forceClean && this.pipelineSteps.tokenExaminer) {
        this.pipelineSteps.tokenExaminer.clearCache();
      }
    });

    this.checkInstalledAddons();

    this.initPacemaker();
    pacemaker.start();

    try {
      this.disabled_sites = new Set(JSON.parse(utils.getPref(this.DISABLED_SITES_PREF, '[]')));
    } catch (e) {
      this.disabled_sites = new Set();
    }

    this.tp_events = new PageEventTracker((payloadData) => {
      // take telemetry data to be pushed and add module metadata
      const enabled = {
        qs: this.isQSEnabled(),
        cookie: this.isCookieEnabled(),
        bloomFilter: this.isBloomFilterEnabled(),
        trackTxt: this.isTrackerTxtEnabled(),
        forceBlock: this.isForceBlockEnabled(),
      };
      const updateInTime = this.qs_whitelist.isUpToDate();
      payloadData.forEach((pageload) => {
        const payl = {
          data: [pageload],
          ver: this.VERSION,
          conf: enabled,
          addons: this.similarAddon,
          updateInTime,
        };
        this.telemetry({
          message: { type: telemetry.msgType, action: 'attrack.tp_events', payload: payl },
          raw: true,
        });
      });
    });

    initPromises.push(this.initPipeline());

    // cleanup legacy database
    cleanLegacyDb();

    return Promise.all(initPromises);
  }

  initPipeline() {
    return this.unloadPipeline().then(() => {
      // Initialise classes which are used as steps in listeners
      const steps = {
        pageLogger: new PageLogger(this.tp_events),
        tokenExaminer: new TokenExaminer(this.qs_whitelist, this.config),
        tokenTelemetry: new TokenTelemetry(
          this.telemetry.bind(this),
          this.qs_whitelist,
          this.config),
        domChecker: new DomChecker(),
        tokenChecker: new TokenChecker(
          this.qs_whitelist,
          {},
          this.hashProb,
          this.config,
          this.telemetry),
        blockRules: new BlockRules(this.config),
        cookieContext: new CookieContext(this.config, this.tp_events),
        redirectTagger: new RedirectTagger(),
        subdomainChecker: new SubdomainChecker(this.config),
      };

      this.pipelineSteps = steps;

      // initialise step objects
      Object.keys(steps).forEach((key) => {
        const step = steps[key];
        if (step.init) {
          step.init();
        }
      });

      // create pipeline for on open request
      this.pipelines.open = new Pipeline('attrack.open', [
        [steps.redirectTagger.checkRedirect.bind(steps.redirectTagger), 'redirectTagger.checkRedirect'],
        [function checkIsMainDocument(state) {
          return !state.requestContext.isFullPage();
        }, 'checkIsMainDocument'],
        [skipInternalProtocols, 'skipInternalProtocols'],
        [checkSameGeneralDomain, 'checkSameGeneralDomain'],
        [this.cancelRecentlyModified.bind(this), 'cancelRecentlyModified'],
        [steps.subdomainChecker.checkBadSubdomain.bind(steps.subdomainChecker), 'subdomainChecker.checkBadSubdomain'],
        [steps.tokenExaminer.examineTokens.bind(steps.tokenExaminer), 'tokenExaminer.examineTokens'],
        [steps.tokenTelemetry.extractKeyTokens.bind(steps.tokenTelemetry), 'tokenTelemetry.extractKeyTokens'],
        [steps.pageLogger.attachStatCounter.bind(steps.pageLogger), 'pageLogger.attachStatCounter'],
        [steps.pageLogger.logRequestMetadata.bind(steps.pageLogger), 'pageLogger.logRequestMetadata'],
        [steps.domChecker.checkDomLinks.bind(steps.domChecker), 'domChecker.checkDomLinks'],
        [steps.domChecker.parseCookies.bind(steps.domChecker), 'domChecker.parseCookies'],
        [steps.tokenChecker.findBadTokens.bind(steps.tokenChecker), 'tokenChecker.findBadTokens'],
        [function checkShouldBlock(state) {
          return state.badTokens.length > 0 && this.qs_whitelist.isUpToDate();
        }.bind(this), 'checkShouldBlock'],
        [this.isQSEnabled.bind(this), 'isQSEnabled'],
        [steps.blockRules.applyBlockRules.bind(steps.blockRules), 'blockRules.applyBlockRules'],
        [function checkSourceWhitelisted(state) {
          if (this.isSourceWhitelisted(state.sourceUrlParts.hostname)) {
            state.incrementStat('source_whitelisted');
            return false;
          }
          return true;
        }.bind(this), 'checkSourceWhitelisted'],
        [this.applyBlock.bind(this), 'applyBlock'],
      ]);

      // create pipeline for on modify request
      this.pipelines.modify = new Pipeline('attrack.modify', [
        [steps.cookieContext.assignCookieTrust.bind(steps.cookieContext), 'cookieContext.assignCookieTrust'],
        [steps.redirectTagger.confirmRedirect.bind(steps.redirectTagger), 'redirectTagger.confirmRedirect'],
        [steps.pageLogger.logMainDocument.bind(steps.pageLogger), 'pageLogger.logMainDocument'],
        [skipInternalProtocols, 'skipInternalProtocols'],
        [checkSameGeneralDomain, 'checkSameGeneralDomain'],
        [steps.subdomainChecker.checkBadSubdomain.bind(steps.subdomainChecker), 'subdomainChecker.checkBadSubdomain'],
        [steps.pageLogger.attachStatCounter.bind(steps.pageLogger), 'pageLogger.attachStatCounter'],
        [function catchMissedOpenListener(state, response) {
          if ((state.reqLog && state.reqLog.c === 0) ||
              steps.redirectTagger.isFromRedirect(state.url)) {
            // take output from 'open' pipeline and copy into our response object
            this.pipelines.open.execute(state, response);
          }
          return true;
        }.bind(this), 'catchMissedOpenListener'],
        [function overrideUserAgent(state, response) {
          if (this.config.overrideUserAgent === true) {
            const domainHash = state.urlParts.generalDomainHash;
            if (this.qs_whitelist.isTrackerDomain(domainHash)) {
              response.modifyHeader('User-Agent', 'CLIQZ');
              state.incrementStat('override_user_agent');
            }
          }
          return true;
        }.bind(this), 'overrideUserAgent'],
        [function checkHasCookie(state) {
          state.cookieData = state.requestContext.getCookieData();
          if (state.cookieData && state.cookieData.length > 5) {
            state.incrementStat('cookie_set');
            return true;
          }
          return false;
        }, 'checkHasCookie'],
        [this.checkIsCookieWhitelisted.bind(this), 'checkIsCookieWhitelisted'],
        [steps.cookieContext.checkCookieTrust.bind(steps.cookieContext), 'cookieContext.checkCookieTrust'],
        [steps.cookieContext.checkVisitCache.bind(steps.cookieContext), 'cookieContext.checkVisitCache'],
        [steps.cookieContext.checkContextFromEvent.bind(steps.cookieContext), 'cookieContext.checkContextFromEvent'],
        [function shouldBlockCookie(state) {
          const shouldBlock = this.isCookieEnabled(state.sourceUrlParts.hostname);
          if (!shouldBlock) {
            state.incrementStat('bad_cookie_sent');
          }
          return shouldBlock;
        }.bind(this), 'shouldBlockCookie'],
        [function blockCookie(state, response) {
          state.incrementStat('cookie_blocked');
          state.incrementStat('cookie_block_tp1');
          response.modifyHeader('Cookie', '');
          response.modifyHeader(this.config.cliqzHeader, ' ');
          return true;
        }.bind(this), 'blockCookie'],
      ]);

      // create pipeline for on response received
      this.pipelines.response = new Pipeline('attrack.response', [
        [function checkMainDocumentRedirects(state) {
          if (state.requestContext.isFullPage()) {
            if ([300, 301, 302, 303, 307].indexOf(state.responseStatus) >= 0) {
              // redirect, update location for tab
              // if no redirect location set, stage the tab id so we don't get false data
              const redirectUrl = state.requestContext.getResponseHeader('Location');
              const redirectUrlParts = URLInfo.get(redirectUrl) || {};
              // if redirect is relative, use source domain
              if (!redirectUrlParts.hostname) {
                redirectUrlParts.hostname = state.urlParts.hostname;
                redirectUrlParts.path = redirectUrl;
              }
              this.tp_events.onRedirect(
                redirectUrlParts,
                state.tabId,
                state.requestContext.isChannelPrivate()
              );
            }
            return false;
          }
          return true;
        }.bind(this), 'checkMainDocumentRedirects'],
        [skipInternalProtocols, 'skipInternalProtocols'],
        [function skipBadSource(state) {
          return state.sourceUrl !== '' && state.sourceUrl.indexOf('about:') === -1;
        }, 'skipBadSource'],
        [checkSameGeneralDomain, 'checkSameGeneralDomain'],
        [steps.redirectTagger.checkRedirectStatus.bind(steps.redirectTagger), 'redirectTagger.checkRedirectStatus'],
        [steps.pageLogger.attachStatCounter.bind(steps.pageLogger), 'pageLogger.attachStatCounter'],
        [function logResponseStats(state) {
          if (state.incrementStat) {
            state.incrementStat('resp_ob');
            state.incrementStat('content_length', parseInt(state.requestContext.getResponseHeader('Content-Length'), 10) || 0);
            state.incrementStat(`status_${state.requestContext.channel.responseStatus}`);
            state.incrementStat(state.requestContext.isCached ? 'cached' : 'not_cached');
          }
          return true;
        }, 'logResponseStats'],
        [function checkSetCookie(state) {
          // if there is a set-cookie header, continue
          const setCookie = state.requestContext.getResponseHeader('Set-Cookie');
          if (setCookie) {
            state.incrementStat('set_cookie_set');
            return true;
          }
          return false;
        }, 'checkSetCookie'],
        [function shouldBlockCookie(state) {
          return this.isCookieEnabled(state.sourceUrlParts.hostname);
        }.bind(this), 'shouldBlockCookie'],
        [this.checkIsCookieWhitelisted.bind(this), 'checkIsCookieWhitelisted'],
        [steps.cookieContext.checkCookieTrust.bind(steps.cookieContext), 'cookieContext.checkCookieTrust'],
        [steps.cookieContext.checkVisitCache.bind(steps.cookieContext), 'cookieContext.checkVisitCache'],
        [steps.cookieContext.checkContextFromEvent.bind(steps.cookieContext), 'cookieContext.checkContextFromEvent'],
        [function blockSetCookie(state, response) {
          response.modifyHeader('Set-Cookie', '');
          state.incrementStat('set_cookie_blocked');
          return true;
        }, 'blockSetCookie'],
      ]);

      // Add steps to the global web request pipeline
      return Promise.all(Object.keys(this.pipelines).map(stage =>
        this.webRequestPipeline.action('addPipelineStep',
          stage,
          {
            fn: (...args) => this.pipelines[stage].execute(...args),
            name: `antitracking.${stage}`,
          }
        )
      ));
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
    return Promise.all(Object.keys(this.pipelines).map(stage =>
      this.webRequestPipeline.action('removePipelineStep',
        stage,
        `antitracking.${stage}`)
    )).then(() => {
      this.pipelines = {};
    });
  }

  /** Per-window module initialisation
  */
  initWindow(window) {
    if (browser.getBrowserMajorVersion() < this.MIN_BROWSER_VERSION) {
      return;
    }
    this.getPrivateValues(window);
  }

  unload() {
    // don't need to unload if disabled
    if (browser.getBrowserMajorVersion() >= this.MIN_BROWSER_VERSION) {
      // Check is active usage, was sent

      // force send tab telemetry data
      // NOTE - this is an async operation
      this.tp_events.commit(true, true);
      this.tp_events.push(true);

      this.qs_whitelist.destroy();

      pacemaker.stop();

      this.unloadPipeline().catch((err) => {
        if (err.name === ModuleDisabledError.name) {
          console.log('attrack', 'cannot unload: webrequest-pipeline was already unloaded');
          return Promise.resolve();
        }
        return Promise.reject(err);
      });

      events.clean_channel('attrack:safekeys_updated');
    }
  }

  checkInstalledAddons() {
    checkInstalledPrivacyAddons().then((adds) => {
      this.similarAddon = adds;
    }).catch(() => {
      // rejection expected on platforms which do not support addon check
    });
  }

  hourChanged() {
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

  applyBlock(state, response) {
    const badTokens = state.badTokens;
    let rule = this.getDefaultRule();
    const trackerTxt = TrackerTXT.get(state.sourceUrlParts);

    if (!this.isForceBlockEnabled() && this.isTrackerTxtEnabled()) {
      if (trackerTxt.last_update === null) {
        // The first update is not ready yet for this first party, allow it
        state.incrementStat(`tracker.txt_not_ready${rule}`);
        return false;
      }
      rule = trackerTxt.getRule(state.urlParts.hostname);
    }

    if (this.debug) {
      console.log('ATTRACK', rule, 'URL:', state.urlParts.hostname, state.urlParts.path, 'TOKENS:', badTokens);
    }

    if (rule === 'block') {
      state.incrementStat(`token_blocked_${rule}`);
      response.block();
      return false;
    }

    let tmpUrl = state.requestContext.url;
    for (let i = 0; i < badTokens.length; i += 1) {
      if (tmpUrl.indexOf(badTokens[i]) < 0) {
        badTokens[i] = encodeURIComponent(badTokens[i]);
      }
      tmpUrl = tmpUrl.replace(badTokens[i], this.obfuscate(badTokens[i], rule));
    }

    // In case unsafe tokens were in the hostname, the URI is not valid
    // anymore and we can cancel the request.
    if (!tmpUrl.startsWith(`${state.urlParts.protocol}://${state.urlParts.hostname}`)) {
      response.block();
      return false;
    }

    state.incrementStat(`token_blocked_${rule}`);

    // TODO: do this nicer
    // if (this.pipelineSteps.trackerProxy && this.pipelineSteps.trackerProxy.shouldProxy(tmpUrl)) {
    //     state.incrementStat('proxy');
    // }
    this.recentlyModified.add(state.tabId + state.url, 30000);
    this.recentlyModified.add(state.tabId + tmpUrl, 30000);

    response.redirectTo(tmpUrl);
    response.modifyHeader(this.config.cliqzHeader, ' ');
    return true;
  }

  checkIsCookieWhitelisted(state) {
    if (this.isInWhitelist(state.urlParts.hostname)) {
      const stage = state.responseStatus !== undefined ? 'set_cookie' : 'cookie';
      state.incrementStat(`${stage}_allow_whitelisted`);
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
  getTabBlockingInfo(tabId, url) {
    const result = {
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
    if (url && (url.indexOf('about') === 0 || url.indexOf('chrome') === 0)) {
      result.error = 'Special tab';
      return Promise.resolve(result);
    }

    if (!(tabId in this.tp_events._active)) {
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

    const tabData = this.tp_events._active[tabId];
    const plainData = tabData.asPlainObject();
    const trackers = Object.keys(tabData.tps).filter(domain => Promise.resolve(
      this.qs_whitelist.isTrackerDomain(md5(getGeneralDomain(domain)).substring(0, 16)) ||
      plainData.tps[domain].blocked_blocklist > 0
    ));

    // const firstPartyCompany = domainInfo.domainOwners[getGeneralDomain(tabData.hostname)];
    result.hostname = tabData.hostname;
    result.path = tabData.path;

    trackers.forEach((dom) => {
      result.trackers[dom] = {};
      ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs', 'set_cookie_blocked', 'blocked_blocklist'].forEach((k) => {
        result.trackers[dom][k] = plainData.tps[dom][k] || 0;
      });

      // actual block count can be in several different signals, depending on
      // configuration. Aggregate them into one.
      result.trackers[dom].tokens_removed = ['empty', 'replace', 'placeholder', 'block'].reduce(
        (cumsum, action) => cumsum + (plainData.tps[dom][`token_blocked_${action}`] || 0), 0
      );
      result.trackers[dom].tokens_removed += plainData.tps[dom].blocked_blocklist || 0;

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

      const company = getDomainOwner(dom);
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

  /**
   * Returns bugIds for a tab (based on Ghostery schema)
   */
  getAppsForTab(tabId) {
    const tabData = this.tp_events._active[tabId];
    if (!tabData) {
      return Promise.reject();
    }
    const apps = {
      known: {},
      unknown: {}
    };

    function actionName(blocked, unsafe) {
      if (blocked) {
        return 'blocked';
      }
      if (unsafe) {
        return 'unsafe';
      }
      return 'safe';
    }

    // blocked by antitracking blocker
    if (tabData.annotations.apps) {
      tabData.annotations.apps.forEach((action, app) => {
        apps.known[getBugOwner(app)] = actionName(action === 'BLOCK', action === 'ALLOW_UNSAFE');
      });
    }
    // blocked/seen by antitracking
    return this.getTabBlockingInfo(tabId).then((info) => {
      Object.keys(info.trackers).forEach((domain) => {
        const tld = getGeneralDomain(domain);
        const id = domainInfo.domains[tld];
        const blocked = info.trackers[domain].tokens_removed > 0 ||
          info.trackers[domain].blocked_blocklist > 0;
        const unsafe = info.trackers[domain].bad_qs > 0;
        if (id) {
          apps.known[id] = actionName(blocked || apps.known[id] === true, unsafe);
        } else {
          apps.unknown[tld] = actionName(blocked, unsafe);
        }
      });

      return apps;
    });
  }

  /** Enables Attrack module with cookie, QS and referrer protection enabled.
   *  if module_only is set to true, will not set preferences for cookie, QS
   *  and referrer protection (for selective loading in AB tests)
   */
  enableModule(moduleOnly) {
    if (this.isEnabled()) {
      return;
    }

    this.config.setPref('enabled', true);
    if (!moduleOnly) {
      this.config.setPref('cookieEnabled', true);
      this.config.setPref('qsEnabled', true);
    }
  }

  /** Disables anti-tracking immediately.
  */
  disableModule() {
    utils.setPref(this.config.PREFS.enabled, false);
  }

  saveSourceDomainWhitelist() {
    utils.setPref(this.DISABLED_SITES_PREF,
      JSON.stringify(Array.from(this.disabled_sites)));
  }

  isSourceWhitelisted(hostname) {
    return this.disabled_sites.has(hostname);
  }

  addSourceDomainToWhitelist(domain) {
    this.disabled_sites.add(domain);
    // also send domain to humanweb
    this.telemetry({
      message: {
        type: telemetry.msgType,
        action: 'attrack.whitelistDomain',
        payload: domain
      },
      raw: true,
    });
    this.saveSourceDomainWhitelist();
  }

  removeSourceDomainFromWhitelist(domain) {
    this.disabled_sites.delete(domain);
    this.saveSourceDomainWhitelist();
  }

  clearCache() {
    if (this.pipelineSteps.tokenExaminer) {
      this.pipelineSteps.tokenExaminer.clearCache();
    }
    if (this.pipelineSteps.tokenChecker) {
      this.pipelineSteps.tokenChecker.tokenDomain.clear();
    }
  }
}
