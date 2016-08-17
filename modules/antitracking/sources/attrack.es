/*
 * This module prevents user from 3rd party tracking
 */
import pacemaker from 'antitracking/pacemaker';
import * as persist from 'antitracking/persistent-state';
import TempSet from 'antitracking/temp-set';
import HttpRequestContext from 'antitracking/webrequest-context';
import tp_events from 'antitracking/tp_events';
import md5 from 'antitracking/md5';
import { parseURL, dURIC, getHeaderMD5, URLInfo, shuffle, findOauth } from 'antitracking/url';
import { getGeneralDomain, sameGeneralDomain } from 'antitracking/domain';
import { HashProb } from 'antitracking/hash';
import { TrackerTXT, sleep, getDefaultTrackerTxtRule } from 'antitracking/tracker-txt';
import { AttrackBloomFilter } from 'antitracking/bloom-filter';
import * as datetime from 'antitracking/time';
import QSWhitelist from 'antitracking/qs-whitelists';
import BlockLog from 'antitracking/block-log';
import { utils, events, Promise } from 'core/cliqz';
import ResourceLoader from 'core/resource-loader';
import core from 'core/background';
import CookieChecker from 'antitracking/cookie-checker';
import TrackerProxy from 'antitracking/tracker-proxy';
import { compressionAvailable, splitTelemetryData, compressJSONToBase64, generatePayload } from 'antitracking/utils';
import {PrivacyScore} from 'antitracking/privacy-score';
import * as browser from 'platform/browser';
import WebRequest from 'core/webrequest';
import telemetry from 'antitracking/telemetry';

var countReload = false;

function onUrlbarFocus(){
    countReload = true;
}

/**
 * Add padding characters to the left of the given string.
 *
 * @param {string} str  - original string.
 * @param {string} char - char used for padding the string.
 * @param {number} size - desired size of the resulting string (after padding)
**/
function leftpad(str, char, size) {
  // This function only makes sens if `char` is a character.
  if (char.length != 1) {
    throw new Error("`char` argument must only contain one character");
  }

  if (str.length >= size) {
    return str;
  }
  else {
    return (char.repeat(size - str.length) + str);
  }
}

/**
 * Remove any trace of source domains, or hashes of source domains
 * from the data to be sent to the backend. This is made to ensure
 * there is no way to backtrack to user's history using data sent to
 * the backend.
 *
 * Replace all the keys of `trackerData` (which are 16-chars prefixes of
 * hash of the source domain) by unique random strings of size 16 (which is
 * expected by backend). We don't have to make them unique among all data,
 * it is enough to ensure unicity on a per-tracker basis.
 *
 * @param {Object} trackerData - associate source domains to key/value pairs.
**/
function anonymizeTrackerTokens(trackerData) {
  // Random base id
  const min = 1;
  const max = Number.MAX_SAFE_INTEGER;
  let randId = Math.floor(Math.random() * (max - min + 1)) + min;

  // Anonymize the given tracker data
  let anonymizedTrackerData = {};

  for (let originalKey in trackerData) {
    const newRandomKey = leftpad(randId.toString().substr(0, 16), '0', 16);
    randId = (randId + 1) % max;
    anonymizedTrackerData[newRandomKey] = trackerData[originalKey];
  }

  return anonymizedTrackerData;
}

var CliqzAttrack = {
    VERSION: '0.96',
    MIN_BROWSER_VERSION: 35,
    LOG_KEY: 'attrack',
    VERSIONCHECK_URL: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
    URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
    URL_BLOCK_RULES: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json',
    ENABLE_PREF: 'antiTrackTest',
    debug: false,
    msgType:'attrack',
    timeCleaningCache: 180*1000,
    timeAfterLink: 5*1000,
    timeActive: 20*1000,
    timeBootup: 10*1000,
    bootupTime: Date.now(),
    bootingUp: true,
    whitelist: null,
    obsCounter: {},
    similarAddon: false,
    blockingFailed:{},
    trackReload:{},
    reloadWhiteList:{},
    tokenDomainCountThreshold: 2,
    safeKeyExpire: 7,
    localBlockExpire: 24,
    shortTokenLength: 8,
    safekeyValuesThreshold: 4,
    cChecker: new CookieChecker(),
    qsBlockRule: null,  // list of domains should be blocked instead of shuffling
    blocked: null,  // log what's been blocked
    placeHolder: '',
    tp_events: tp_events,
    tokens: null,
    instantTokenCache: {},
    requestKeyValue: null,
    recentlyModified: new TempSet(),
    cliqzHeader: 'CLIQZ-AntiTracking',
    replacement: "",
    obfuscate: function(s, method, replacement) {
        // used when action != 'block'
        // default is a placeholder
        switch(method) {
        case 'empty':
            return '';
        case 'replace':
            return shuffle(s);
        case 'same':
            return s;
        case 'placeholder':
            return CliqzAttrack.placeHolder;
        default:
            return CliqzAttrack.placeHolder;
        }
    },
    bootupWhitelistCache: {},
    blockedCache: {},
    visitCache: {},
    contextOauth: {},
    linksFromDom: {},
    cookiesFromDom: {},
    loadedTabs: {},
    getBrowserMajorVersion: function() {
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
        return parseInt(appInfo.version.split('.')[0]);
    },
    getPrivateValues: function(window) {
        // creates a list of return values of functions may leak private info
        var p = {};
        // var navigator = CliqzUtils.getWindow().navigator;
        var navigator = window.navigator;
        // plugins
        for (var i = 0; i < navigator.plugins.length; i++) {
            var name = navigator.plugins[i].name;
            if (name.length >= 8) {
                p[name] = true;
            }
        }
        CliqzAttrack.privateValues = p;
    },
    getCookieValues: function(c, url) {
        if (c == null) {
            return {};
        }
        var v = 0, cookies = {};
        if (c.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
            c = RegExp.$1;
            v = 1;
        }
        if (v === 0) {
            c.split(/[,;]/).map(function(cookie) {
                var parts = cookie.split(/=/);
                if (parts.length > 1) parts[1] = parts.slice(1).join('=');
                var name = dURIC(parts[0].trimLeft()),
                    value = parts.length > 1 ? dURIC(parts[1].trimRight()) : null;
                cookies[name] = value;
            });
        } else {
            c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function($0, $1) {
            var name = $0,
                value = $1.charAt(0) === '"'
                          ? $1.substr(1, -1).replace(/\\(.)/g, "$1")
                          : $1;
                cookies[name] = value;
            });
        }
        // return cookies;
        var cookieVal = {};
        for (var key in cookies) {
            if (url.indexOf(cookies[key]) == -1) { // cookies save as part of the url is allowed
                cookieVal[cookies[key]] = true;
            }
        }
        return cookieVal;
    },
    httpopenObserver: {
        observe : function(requestDetails) {
            if (!CliqzAttrack.qs_whitelist.isReady()) {
                return;
            }

            var requestContext = new HttpRequestContext(requestDetails);
            var url = requestContext.url;
            if (!url || url == '') return;
            var url_parts = URLInfo.get(url);

            if (requestContext.isFullPage()) {
                CliqzAttrack.tp_events.onFullPage(url_parts, requestContext.getOuterWindowID(), requestContext.isChannelPrivate());
                if (CliqzAttrack.isTrackerTxtEnabled()) {
                    TrackerTXT.get(url_parts).update();
                }
                CliqzAttrack.blockLog.incrementLoadedPages();
                return;
            }

            // This needs to be a common function aswell. Also consider getting ORIGIN header.
            var referrer = requestContext.getReferrer();
            var same_gd = false;

            // We need to get the source from where the request originated.
            // There are two ways in which we can get it.
            // 1. header -> REFERRER
            // 2. Get source url.
            // 3. header -> ORIGIN (This needs to be investigated.)

            var source_url = requestContext.getLoadingDocument(),
                source_url_parts = null,
                source_tab = requestContext.getOriginWindowID();

            var page_load_type = null;
            var request_type = null;
            switch(requestContext.getContentPolicyType()) {
                case 6:
                    page_load_type = "fullpage";
                    request_type = "fullpage";
                    break;
                case 7: page_load_type = "frame"; break;
                default: page_load_type = null;
            }
            if (source_url == '' || source_url.indexOf('about:')==0) return;
            if(page_load_type == 'fullpage') return;

            // modify or cancel the http request if the url contains personal identifier
            // Now refstr should not be null, but still keeping the clause to check from edge cases.

            if (source_url != null) {
                source_url_parts = URLInfo.get(source_url);

                // same general domain
                same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                if (same_gd) {
                  return;
                }

                // find the ok tokens fields
                var isPrivate = requestContext.isChannelPrivate();
                if (!isPrivate) {
                    CliqzAttrack.examineTokens(url_parts);
                }

                // extract and save tokens
                CliqzAttrack.extractKeyTokens(url_parts, source_url_parts['hostname'], isPrivate, CliqzAttrack.saveKeyTokens);
                CliqzAttrack.recordLinksForURL(source_url);

                var reflinks = CliqzAttrack.linksFromDom[source_url] || {};

                // work around for https://github.com/cliqz/navigation-extension/issues/1230
                if (CliqzAttrack.recentlyModified.contains(source_tab + url)) {
                    CliqzAttrack.recentlyModified.delete(source_tab + url);
                    return {cancel: true} ;
                }
                if (url in reflinks) {
                    CliqzAttrack.tp_events.incrementStat(req_log, "url_in_reflinks");
                    // return;
                }

                // log third party request
                var req_log = null;
                if(url_parts.hostname != source_url_parts.hostname) {
                    req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                    tp_events.incrementStat(req_log, 'c');
                    if(url_parts['query'].length > 0) {
                        tp_events.incrementStat(req_log, 'has_qs');
                    }
                    if(url_parts['parameters'].length > 0) {
                        tp_events.incrementStat(req_log, 'has_ps');
                    }
                    if(url_parts['fragment'].length > 0) {
                        tp_events.incrementStat(req_log, 'has_fragment');
                    }
                    let content_type = requestContext.getContentPolicyType();
                    if (!content_type) {
                        CliqzAttrack.tp_events.incrementStat(req_log, "type_unknown");
                    } else {
                        CliqzAttrack.tp_events.incrementStat(req_log, "type_" + content_type);
                    }

                    // log protocol (secure or not)
                    const isHTTP = protocol => protocol === "http" || protocol === "https"
                    const scheme = isHTTP(url_parts.protocol) ? url_parts.protocol : "other";
                    tp_events.incrementStat(req_log, 'scheme_' + scheme);

                    // find frame depth
                    tp_events.incrementStat(req_log, 'window_depth_' + requestContext.getWindowDepth());
                }

                // get cookie data
                var cookievalue = {},
                    docCookie = '';
                if (source_url in CliqzAttrack.cookiesFromDom && CliqzAttrack.cookiesFromDom[source_url]) {
                    docCookie = CliqzAttrack.cookiesFromDom[source_url];
                    cookievalue = CliqzAttrack.getCookieValues(docCookie, url);
                } else {
                    // try to get the document from source
                    try {
                        if (source.lc) {
                            docCookie = source.lc.topWindow.document.cookie;
                            if (docCookie) {
                                cookievalue = CliqzAttrack.getCookieValues(docCookie, url);
                            }
                        }
                    } catch (e) {}
                }
                try {
                    var cookiedata = requestContext.getRequestHeader('Cookie');
                    var cookie2 = CliqzAttrack.getCookieValues(cookiedata, url);
                } catch(e) {
                    var cookie2 = {};
                }

                for (var c in cookie2) {
                    cookievalue[c] = true;
                }

                var stats = {};
                var badTokens = CliqzAttrack.checkTokens(url_parts, source_url, cookievalue, stats, source_url_parts);
                if(req_log) {
                    // save token stats to the log.
                    Object.keys(stats).forEach(function(key) {
                        if(stats[key] > 0) {
                            tp_events.incrementStat(req_log, 'token.has_'+ key);
                            tp_events.incrementStat(req_log, 'token.'+ key, stats[key]);
                        }
                    });
                }

                if (badTokens.length == 0) {
                    if (CliqzAttrack.trackerProxy.checkShouldProxy(url)) {
                        tp_events.incrementStat(req_log, 'proxy');
                    }
                    return;
                }

                // Block request based on rules specified
                var _key = source_tab + ":" + source_url;
                if (CliqzAttrack.isQSEnabled() && !(CliqzAttrack.reloadWhiteList[_key])) {
                    for (var i = 0; i < CliqzAttrack.qsBlockRule.length; i++) {
                        var sRule = CliqzAttrack.qsBlockRule[i][0],
                            uRule = CliqzAttrack.qsBlockRule[i][1];
                        if (source_url_parts.hostname.endsWith(sRule) &&
                            url_parts.hostname.endsWith(uRule)) {
                            tp_events.incrementStat(req_log, 'req_rule_aborted');
                            return {cancel: true};
                        }
                    }
                }

                if(badTokens.length > 0) {
                    tp_events.incrementStat(req_log, 'bad_qs');
                    tp_events.incrementStat(req_log, 'bad_tokens', badTokens.length);
                }

                // altering request
                // Additional check to verify if the user reloaded the page.
                if (CliqzAttrack.isQSEnabled() && !(CliqzAttrack.reloadWhiteList[_key])) {

                    if (CliqzAttrack.isSourceWhitelisted(source_url_parts.hostname)) {
                        CliqzAttrack.tp_events.incrementStat(req_log, "source_whitelisted");
                        return;
                    }

                    if (CliqzAttrack.debug) {
                        CliqzUtils.log("altering request " + url + " " + source_url + ' ' + same_gd, 'tokk');
                        CliqzUtils.log('bad tokens: ' + JSON.stringify(badTokens), 'tokk');
                    }

                    if (badTokens.length > 0 && CliqzAttrack.qs_whitelist.isUpToDate()) {
                        // determin action based on tracker.txt
                        var rule = CliqzAttrack.getDefaultRule(),
                            _trackerTxt = TrackerTXT.get(source_url_parts);
                        if (!CliqzAttrack.isForceBlockEnabled() && CliqzAttrack.isTrackerTxtEnabled()) {
                            if (_trackerTxt.last_update === null) {
                                // The first update is not ready yet for this first party, allow it
                                tp_events.incrementStat(req_log, 'tracker.txt_not_ready' + rule);
                                return;
                            }
                            rule = _trackerTxt.getRule(url_parts.hostname);
                        }
                        if (rule == 'block') {
                            tp_events.incrementStat(req_log, 'token_blocked_' + rule);
                            return {cancel: true}
                        } else {
                            var tmp_url = requestContext.url;
                            for (var i = 0; i < badTokens.length; i++) {
                                if (tmp_url.indexOf(badTokens[i]) < 0) {
                                    badTokens[i] = encodeURIComponent(badTokens[i])
                                }
                                tmp_url = tmp_url.replace(badTokens[i], CliqzAttrack.obfuscate(badTokens[i], rule, CliqzAttrack.replacement));
                            }

                            // In case unsafe tokens were in the hostname, the URI is not valid
                            // anymore and we can cancel the request.
                            if (!tmp_url.startsWith(url_parts.protocol + '://' + url_parts.hostname)) {
                              return {cancel: true}
                            }

                            tp_events.incrementStat(req_log, 'token_blocked_' + rule);

                            if (CliqzAttrack.trackerProxy.checkShouldProxy(tmp_url)) {
                                tp_events.incrementStat(req_log, 'proxy');
                            }
                            CliqzAttrack.recentlyModified.add(source_tab + url, 30000);
                            CliqzAttrack.recentlyModified.add(source_tab + tmp_url, 30000);
                            return {
                              redirectUrl: tmp_url,
                              requestHeaders: rule != 'same' ? [{name: CliqzAttrack.cliqzHeader, value: ' '}] : undefined
                            }
                        }
                    }
                }
            } else {
                // no refstr: might be able to get a referrer from load context to verify if favicon or extension request
                // Now this should not happen. Keeping the code block for now. Will remove it after more testing.
                if (CliqzAttrack.debug) CliqzUtils.log("THIS CALL DID NOT HAVE A REF","no_refstr");
            }
        }
    },
    httpResponseObserver: {
        observe: function(requestDetails) {
            if (!CliqzAttrack.qs_whitelist.isReady()) {
                return;
            }
            var requestContext = new HttpRequestContext(requestDetails),
                url = requestContext.url;

            if (!url) return;
            var url_parts = URLInfo.get(url);
            var referrer = requestContext.getReferrer();
            var same_gd = false;

            var source_url = requestContext.getLoadingDocument(),
                source_url_parts = null,
                source_tab = requestContext.getOriginWindowID();

            // full page
            if (requestContext.isFullPage()) {
                if ([300, 301, 302, 303, 307].indexOf(requestContext.channel.responseStatus) >= 0) {
                    // redirect, update location for tab
                    // if no redirect location set, stage the tab id so we don't get false data
                    let redirect_url = requestContext.getResponseHeader("Location");
                    let redirect_url_parts = URLInfo.get(redirect_url);
                    // if redirect is relative, use source domain
                    if (!redirect_url_parts.hostname) {
                        redirect_url_parts.hostname = url_parts.hostname;
                        redirect_url_parts.path = redirect_url;
                    }
                    CliqzAttrack.tp_events.onRedirect(redirect_url_parts, requestContext.getOuterWindowID(), requestContext.isChannelPrivate());
                }
                return;
            }

            if (source_url == '' || source_url.indexOf('about:')==0) return;

            if (source_url != null) {
                source_url_parts = URLInfo.get(source_url);
                // extract and save tokens
                same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                if (same_gd) return;

                if(url_parts.hostname != source_url_parts.hostname)
                    var req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                if (req_log) {
                    tp_events.incrementStat(req_log, 'resp_ob');
                    tp_events.incrementStat(req_log, 'content_length', parseInt(requestContext.getResponseHeader('Content-Length')) || 0);
                    tp_events.incrementStat(req_log, `status_${requestContext.channel.responseStatus}`);
                }

                // is cached?
                let cached = requestContext.isCached;
                CliqzAttrack.tp_events.incrementStat(req_log, cached ? 'cached' : 'not_cached');


                // broken by attrack?
                if (CliqzAttrack.recentlyModified.has(source_tab + url) && requestContext.channel.responseStatus >= 400) {
                  const payload = {
                    source: source_url,
                    status: requestContext.channel.responseStatus,
                    url_info: {
                      protocol: url_parts.protocol,
                      hostname: url_parts.hostname,
                      path: md5(url_parts.path),
                      params: url_parts.getKeyValuesMD5()
                    },
                    context: requestContext.getWindowDepth()
                  };
                  const msg = {
                    'type': telemetry.msgType,
                    'action': 'attrack.breakage',
                    'payload': CliqzAttrack.generateAttrackPayload(payload)
                  };
                  telemetry.telemetry(msg);
                }
            }
        }
    },
    httpmodObserver: {
        observe : function(requestDetails) {
            var requestContext = new HttpRequestContext(requestDetails),
                url = requestContext.url,
                blockingResponse = {};

            if (!url) return;

            var url_parts = URLInfo.get(url);

            var cookie_data = requestContext.getCookieData();


            // Quick escapes:
            // localhost or no cookie data
            if (url_parts['hostname'] == 'localhost' || !cookie_data) {
                return;
            }

            // Gather more info for further checks
            var curr_time = Date.now();
            if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) CliqzAttrack.bootingUp = false;

            // check if fill context oauth, this needs to be done before accepting or requesting the cookies.
            var ourl = findOauth(url, url_parts);
            if (ourl) {
                CliqzAttrack.contextOauth = {'ts': curr_time, 'html': dURIC(ourl) + ':' + url};
                if (CliqzAttrack.debug) CliqzUtils.log("OAUTH: " + JSON.stringify(CliqzAttrack.contextOauth), CliqzAttrack.LOG_KEY);
            }

            // content policy type 6 == TYPE_DOCUMENT: top level dom element. Do not block.
            if (requestContext.isFullPage()) {
                return;
            }

            var referrer = requestContext.getReferrer();

            // if the request is originating from a tab, we can get a source url
            // The implementation below is causing a bug, if we load different urls in same tab.
            // This is better handeled in capturing request type. When request type == fullpage
            // Then uri.spec == source_url
            // Only get source tabs for now.

            var source_url = requestContext.getLoadingDocument(),
                source_url_parts = null,
                source_tab = requestContext.getOriginWindowID();

            var page_load_type = null;
            var request_type = null;
            switch(requestContext.getContentPolicyType()) {
                case 6:
                    page_load_type = "fullpage";
                    request_type = "fullpage";
                    break;
                case 7: page_load_type = "frame"; break;
                default: page_load_type = null;
            }

            // Fallback to referrer if we don't find source from tab
            if (source_url === undefined || source_url == ''){
                source_url = referrer;
            }

            if (!source_url) {
                return;
            }

            source_url_parts = URLInfo.get(source_url);
            var req_log = null;

            var same_gd = false;
            if (url_parts.hostname!='' && source_url_parts && source_url_parts.hostname!='') {
                same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname);
            }

            if (same_gd) {
                // not a 3rd party cookie, do nothing
                return;
            }

            req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);

            if (req_log && req_log.c === 0) {
                blockingResponse = CliqzAttrack.httpopenObserver.observe(requestDetails) || {};
                req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
            }

            tp_events.incrementStat(req_log, 'cookie_set');
            if (source_url.indexOf('about:')==0) {
                // it's a brand new tab, and the url is loaded externally,
                // about:home, about:blank
                tp_events.incrementStat(req_log, 'cookie_allow_newtab');
                CliqzAttrack.allowCookie(url, {'dst': url_parts.hostname, 'src': source_url, 'data': cookie_data, 'ts': curr_time}, "about:blank");
                return blockingResponse;
            }

            // check if domain is whitelisted,
            if (CliqzAttrack.isInWhitelist(url_parts.hostname)) {
                tp_events.incrementStat(req_log, 'cookie_allow_whitelisted');
                if (CliqzAttrack.debug) CliqzUtils.log("Is whitelisted (type: direct): " + url, CliqzAttrack.LOG_KEY);
                return blockingResponse;
            }

            var host = getGeneralDomain(url_parts.hostname);
            var diff = curr_time - (CliqzAttrack.visitCache[host] || 0);

            // This is order to only allow visited sources from browser. Else some redirect calls
            // Getting leaked.
            var s_host = '';
            if(source_url && source_url_parts.hostname){
                s_host = getGeneralDomain(source_url_parts.hostname);
            }

            // check visitcache to see if this domain is temporarily allowed.
            // Additional check required when gd=false and request_type== full_page, else block
            if (diff < CliqzAttrack.timeActive && CliqzAttrack.visitCache[s_host]) {
                var src = null;
                if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                tp_events.incrementStat(req_log, 'cookie_allow_visitcache');
                CliqzAttrack.allowCookie(url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "visitcache");
                return blockingResponse;
            }

            // check if user initiated this request by an element click.
            if (CliqzAttrack.cChecker.contextFromEvent) {
                var diff = curr_time - (CliqzAttrack.cChecker.contextFromEvent.ts || 0);
                if (diff < CliqzAttrack.timeAfterLink) {

                    var host = getGeneralDomain(url_parts.hostname);
                    if (host === CliqzAttrack.cChecker.contextFromEvent.gDM) {
                        CliqzAttrack.visitCache[host] = curr_time;
                        var src = null;
                        if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                        tp_events.incrementStat(req_log, 'cookie_allow_userinit_same_context_gd');
                        CliqzAttrack.allowCookie(url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "contextFromEvent");
                        return blockingResponse;
                    }
                    var pu = url.split(/[?&;]/)[0];
                    if (CliqzAttrack.cChecker.contextFromEvent.html.indexOf(pu)!=-1) {
                        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED (type2): " + pu + " " + CliqzAttrack.cChecker.contextFromEvent.html, CliqzAttrack.LOG_KEY);

                        // the url is in pu
                        if (url_parts && url_parts.hostname && url_parts.hostname!='') {

                            CliqzAttrack.visitCache[host] = curr_time;

                            tp_events.incrementStat(req_log, 'cookie_allow_userinit_same_gd_link');
                            CliqzAttrack.allowCookie(url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "contextFromEvent");
                            return blockingResponse;
                        }
                    }
                }
            }

            // check for OAuth requests
            if (CliqzAttrack.contextOauth) {
                var diff = curr_time - (CliqzAttrack.contextOauth.ts || 0);
                if (diff < CliqzAttrack.timeActive) {

                    var pu = url.split(/[?&;]/)[0];

                    if (CliqzAttrack.contextOauth.html.indexOf(pu)!=-1) {
                        // the url is in pu
                        if (url_parts && url_parts.hostname && url_parts.hostname!='') {
                            let contextFromEvent = browser.contextFromEvent();
                            if (contextFromEvent && contextFromEvent.html && contextFromEvent.html.indexOf(pu)!=-1) {

                                if (CliqzAttrack.debug) CliqzUtils.log("OAUTH and click " + url, CliqzAttrack.LOG_KEY);
                                var host = getGeneralDomain(url_parts.hostname);
                                var src = null;
                                if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                                tp_events.incrementStat(req_log, 'cookie_allow_oauth');
                                tp_events.incrementStat(req_log, 'req_oauth');
                                CliqzAttrack.allowCookie(url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "contextOauth");
                                return blockingResponse;
                            }
                            else {
                                if (CliqzAttrack.debug) CliqzUtils.log("OAUTH and NOT click " + url, CliqzAttrack.LOG_KEY);
                            }
                        }
                    }
                }
            }

            if (url_parts.hostname!='' && source_url_parts && source_url_parts.hostname!='') {

                // the hostnames are different, but they might still be the same site: e.g.
                // loc5.lacaixa.es => metrics.lacaixa.es

                if (CliqzAttrack.debug) {
                    CliqzUtils.log("cookie detected >>> " + source_url_parts.hostname + " : " + url_parts.hostname, CliqzAttrack.LOG_KEY);
                }

                if ((!same_gd) && cookie_data &&  cookie_data.length>10) {

                    // as test, we do not send the hostname as md5
                    var md5_source_hostname = source_url_parts.hostname;

                    // now, let's kill that cookie and see what happens :-)
                    var _key = source_tab + ":" + source_url;
                    if (CliqzAttrack.isCookieEnabled(source_url_parts.hostname) && !(CliqzAttrack.reloadWhiteList[_key])) {
                        // blocking cookie
                        var src = null;
                        if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                        tp_events.incrementStat(req_log, 'cookie_blocked');
                        tp_events.incrementStat(req_log, 'cookie_block_tp1');
                        CliqzAttrack.blockCookie(source_url_parts.hostname, {'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time}, 'type1')
                        blockingResponse.requestHeaders = [
                          {name: 'Cookie', value: ''},
                          {name: CliqzAttrack.cliqzHeader, value: ' '}
                        ];
                        return blockingResponse;
                    }
                    else {
                        // was not enabled, therefore the cookie gets sent
                        tp_events.incrementStat(req_log, 'bad_cookie_sent');
                    }

                }

            }
            else {
                if (CliqzAttrack.bootingUp) {

                    if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) CliqzAttrack.bootingUp = false;

                    if (CliqzAttrack.debug) CliqzUtils.log(">>> Booting up: "  + url + " : " + url_parts.hostname, CliqzAttrack.LOG_KEY);
                    var key = url_parts.hostname + url_parts.path;
                    if (key && key!='') CliqzAttrack.bootupWhitelistCache[key] = true;
                    tp_events.incrementStat(req_log, 'cookie_allow_bootingup');
                    if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED because bootup: " + key, CliqzAttrack.LOG_KEY);

                }
                else {

                    var key = url_parts.hostname + url_parts.path;
                    if (CliqzAttrack.bootupWhitelistCache[key]==null) {

                        if (CliqzAttrack.isCookieEnabled(source_url_parts.hostname) && !(CliqzAttrack.reloadWhiteList[_key])) {
                            // blocking cookie
                            var src = null;
                            if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                            tp_events.incrementStat(req_log, 'cookie_blocked');
                            tp_events.incrementStat(req_log, 'cookie_block_tp2');
                            CliqzAttrack.blockCookie(url, {'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time}, 'type2')
                            blockingResponse.requestHeaders = [
                              {name: 'Cookie', value: ''},
                              {name: CliqzAttrack.cliqzHeader, value: ' '}
                            ];
                            return blockingResponse;
                        }
                        else {
                            // was not enabled, therefore the cookie gets sent
                            tp_events.incrementStat(req_log, 'bad_cookie_sent');
                        }
                    }
                    else {
                        // should allow, same domain and path as bootup request,
                        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED because bootup: " + key, CliqzAttrack.LOG_KEY);

                    }
                }
            }
            return blockingResponse;
        }
    },
    allowCookie: function(url, req_metadata, reason) {
        if (CliqzAttrack.debug) CliqzUtils.log("ALLOWING because of " + reason + " " + req_metadata['dst'] + ' %% ' + url, CliqzAttrack.LOG_KEY);
    },
    blockCookie: function(url, req_metadata, reason) {
        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie REMOVED (" + reason + "): "  + req_metadata['dst'] + " >>> " + url, CliqzAttrack.LOG_KEY);
        CliqzAttrack.blockedCache[req_metadata['dst']] = req_metadata['ts'];
    },
    onTabLocationChange: function(evnt) {
        var url = evnt.url;

        CliqzAttrack.linksFromDom[url] = {};

        if (evnt.isLoadingDocument) {
            // when a new page is loaded, try to extract internal links and cookies
            var doc = evnt.document;
            CliqzAttrack.loadedTabs[url] = false;

            if(doc) {
                if (doc.body) {
                    CliqzAttrack.recordLinksForURL(url);
                }
                doc.addEventListener(
                    'DOMContentLoaded',
                    function(ev) {
                        CliqzAttrack.loadedTabs[url] = true;
                        CliqzAttrack.recordLinksForURL(url);
                    });
                CliqzAttrack.clearDomLinks();
            }
        }

        // New location, means a page loaded on the top window, visible tab
        var activeURL = browser.currentURL();
        var curr_time = Date.now();

        if ((activeURL.indexOf('about:')!=0) && (activeURL.indexOf('chrome:')!=0)) {

            var url_parts = parseURL(activeURL);

            if (url_parts && url_parts.hostname && url_parts.hostname!='') {
                var host = getGeneralDomain(url_parts.hostname);
                CliqzAttrack.visitCache[host] = curr_time;
            }
        }
    },
    getDefaultRule: function() {
        if (CliqzAttrack.isForceBlockEnabled()) {
            return 'block';
        } else {
            return getDefaultTrackerTxtRule();
        }
    },
    isEnabled: function() {
        return CliqzUtils.getPref(CliqzAttrack.ENABLE_PREF, false);
    },
    isCookieEnabled: function(source_hostname) {
        if (source_hostname != undefined && CliqzAttrack.isSourceWhitelisted(source_hostname)) {
            return false;
        }
        return CliqzUtils.getPref('attrackBlockCookieTracking', true);
    },
    isQSEnabled: function() {
        return CliqzUtils.getPref('attrackRemoveQueryStringTracking', true);
    },
    isFingerprintingEnabled: function() {
        return CliqzUtils.getPref('attrackCanvasFingerprintTracking', false);
    },
    isReferrerEnabled: function() {
        return CliqzUtils.getPref('attrackRefererTracking', false);
    },
    isTrackerTxtEnabled: function() {
        return CliqzUtils.getPref('trackerTxt', false);
    },
    isBloomFilterEnabled: function() {
        return CliqzUtils.getPref('attrackBloomFilter', false);
    },
    isForceBlockEnabled: function() {
        return CliqzUtils.getPref('attrackForceBlock', false);
    },
    initPacemaker: function() {
        let two_mins = 2 * 60 * 1000;

        // create a constraint which returns true when the time changes at the specified fidelity
        function timeChangeConstraint(name, fidelity) {
            if (fidelity == "day") fidelity = 8;
            else if(fidelity == "hour") fidelity = 10;
            return function (task) {
                var timestamp = datetime.getTime().slice(0, fidelity),
                    lastHour = persist.getValue(name + "lastRun") || timestamp;
                persist.setValue(name +"lastRun", timestamp);
                return timestamp != lastHour;
            };
        }

        pacemaker.register(CliqzAttrack.updateConfig, 3 * 60 * 60 * 1000);

        // send instant cache tokens whenever hour changes
        pacemaker.register(CliqzAttrack.sendTokens, 5 * 60 * 1000);
        // if the hour has changed
        pacemaker.register(CliqzAttrack.hourChanged, two_mins, timeChangeConstraint("hourChanged", "hour"));

        // every 2 mins

        function cleanTimestampCache(cacheObj, timeout, currTime) {
          const keys = Object.keys(cacheObj)
          keys.forEach(function(k) {
            if (currTime - cacheObj[k] || 0 > timeout) {
              delete cacheObj[k];
            }
          });
        }

        pacemaker.register(function clean_caches(currTime) {
          // visit cache
          cleanTimestampCache(CliqzAttrack.visitCache, CliqzAttrack.timeCleaningCache, currTime);
          // reload whitelist
          cleanTimestampCache(CliqzAttrack.reloadWhiteList, CliqzAttrack.timeCleaningCache, currTime);
          // track reload
          cleanTimestampCache(CliqzAttrack.trackReload, CliqzAttrack.timeCleaningCache, currTime);
          // blocked cache
          cleanTimestampCache(CliqzAttrack.blockedCache, CliqzAttrack.timeCleaningCache, currTime);
          // record cache
          cleanTimestampCache(CliqzAttrack.linksRecorded, 1000, currTime);
          // tab listener statuses
          CliqzAttrack.tab_listener.cleanTabsStatus();
        }, two_mins);

        var bootup_task = pacemaker.register(function bootup_check(curr_time) {
            if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) {
                CliqzUtils.log("bootup end");
                CliqzAttrack.bootingUp = false;
                pacemaker.deregister(bootup_task);
            }
        });

        pacemaker.register(function tp_event_commit() {
            CliqzAttrack.tp_events.commit();
            CliqzAttrack.tp_events.push();
        }, two_mins);

        // every hour
        let hourly = 60 * 60 * 1000;
        pacemaker.register(CliqzAttrack.pruneRequestKeyValue, hourly);

        pacemaker.register(function annotateSafeKeys() {
            CliqzAttrack.qs_whitelist.annotateSafeKeys(CliqzAttrack.requestKeyValue);
        }, 10 * 60 * 60 * 1000);

    },
    /** Global module initialisation.
     */
    init: function() {
        // disable for older browsers
        if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }

        // Replace getWindow functions with window object used in init.
        if (CliqzAttrack.debug) CliqzUtils.log("Init function called:", CliqzAttrack.LOG_KEY);

        if (!CliqzAttrack.hashProb) {
          CliqzAttrack.hashProb = new HashProb();
        }

        // load all caches:
        // Large dynamic caches are loaded via the persist module, which will lazily propegate changes back
        // to the browser's sqlite database.
        // Large static caches (e.g. token whitelist) are loaded from sqlite
        // Smaller caches (e.g. update timestamps) are kept in prefs
        if (!this._tokens) {
          this._tokens = new persist.AutoPersistentObject("tokens", (v) => CliqzAttrack.tokens = v, 60000);
        }
        //this._blocked = new persist.AutoPersistentObject("blocked", (v) => CliqzAttrack.blocked = v, 300000);

        CliqzAttrack.qs_whitelist = CliqzAttrack.isBloomFilterEnabled() ? new AttrackBloomFilter() : new QSWhitelist();
        CliqzAttrack.qs_whitelist.init();
        CliqzAttrack.blockLog = new BlockLog(CliqzAttrack.qs_whitelist);
        CliqzAttrack.blockLog.init();

        if (!this._requestKeyValue) {
          this._requestKeyValue = new persist.AutoPersistentObject("requestKeyValue", (v) => CliqzAttrack.requestKeyValue = v, 60000);
        }
        // force clean requestKeyValue
        events.sub("attrack:safekeys_updated", (version, forceClean) => {
            if (forceClean) {
                CliqzAttrack._requestKeyValue.clear();
            }
        });

        if (CliqzAttrack.qsBlockRule == null) CliqzAttrack.loadBlockRules();

        // load tracker companies data
        this._trackerLoader = new ResourceLoader( ['antitracking', 'tracker_owners.json'], {
            remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_owners_list.json',
            cron: 24 * 60 * 60 * 1000,
        });
        this._trackerLoader.load().then(CliqzAttrack._parseTrackerCompanies);
        this._trackerLoader.onUpdate(CliqzAttrack._parseTrackerCompanies);

        // load cookie whitelist
        this._cookieWhitelistLoader = new ResourceLoader( ['antitracking', 'cookie_whitelist.json'], {
            remoteURL: 'https://cdn.cliqz.com/anti-tracking/whitelist/cookie_whitelist.json',
            cron: 24 * 60 * 60 * 1000
        });
        var updateCookieWhitelist = (data) => { CliqzAttrack.whitelist = data }
        this._cookieWhitelistLoader.load().then(updateCookieWhitelist);
        this._cookieWhitelistLoader.onUpdate(updateCookieWhitelist);

        CliqzAttrack.checkInstalledAddons();

        if (CliqzAttrack.visitCache == null) {
            CliqzAttrack.visitCache = {};
        }

        CliqzAttrack.initPacemaker();
        pacemaker.start();

        WebRequest.onBeforeRequest.addListener(CliqzAttrack.httpopenObserver.observe, undefined, ['blocking']);
        WebRequest.onBeforeSendHeaders.addListener(CliqzAttrack.httpmodObserver.observe, undefined, ['blocking']);
        WebRequest.onHeadersReceived.addListener(CliqzAttrack.httpResponseObserver.observe);

        try {
            CliqzAttrack.disabled_sites = new Set(JSON.parse(CliqzUtils.getPref(CliqzAttrack.DISABLED_SITES_PREF, "[]")));
        } catch(e) {
            CliqzAttrack.disabled_sites = new Set();
        }

        // note: if a 0 value were to be saved, the default would be preferred. This is ok because these options
        // cannot have 0 values.
        CliqzAttrack.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold')) || 4;
        CliqzAttrack.shortTokenLength = parseInt(persist.getValue('shortTokenLength')) || 8;

        CliqzAttrack.placeHolder = persist.getValue('placeHolder', CliqzAttrack.placeHolder);
        CliqzAttrack.cliqzHeader = persist.getValue('cliqzHeader', CliqzAttrack.cliqzHeader);

        CliqzAttrack.trackerProxy = new TrackerProxy();
        CliqzAttrack.trackerProxy.init();
    },
    /** Per-window module initialisation
     */
    initWindow: function(window) {
        if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }
        // Load listerners:
        window.CLIQZ.Core.urlbar.addEventListener('focus', onUrlbarFocus);

        CliqzAttrack.getPrivateValues(window);
    },
    unload: function() {
        // don't need to unload if disabled
        if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }
        //Check is active usage, was sent

        // force send tab telemetry data
        CliqzAttrack.tp_events.commit(true, true);
        CliqzAttrack.tp_events.push(true);

        CliqzAttrack.blockLog.destroy();
        CliqzAttrack.qs_whitelist.destroy();

        browser.forEachWindow(CliqzAttrack.unloadWindow);

        WebRequest.onBeforeRequest.removeListener(CliqzAttrack.httpopenObserver.observe);
        WebRequest.onBeforeSendHeaders.removeListener(CliqzAttrack.httpmodObserver.observe);
        WebRequest.onHeadersReceived.removeListener(CliqzAttrack.httpResponseObserver.observe);

        pacemaker.stop();

        CliqzAttrack.trackerProxy.destroy();

        this._trackerLoader.stop();
        this._cookieWhitelistLoader.stop();

        events.un_sub("attrack:safekeys_updated");
    },
    unloadWindow: function(window) {
        if (window.CLIQZ) {
            window.CLIQZ.Core.urlbar.removeEventListener('focus', onUrlbarFocus);
        }
    },
    checkInstalledAddons: function() {
        System.import('platform/antitracking/addon-check').then( (addons) => {
            CliqzAttrack.similarAddon = addons.checkInstalledAddons();
        }).catch( (e) => {
            utils.log("Error loading addon checker", "attrack");
        });
    },
    generateAttrackPayload: function(data, ts) {
        const extraAttrs = CliqzAttrack.qs_whitelist.getVersion();
        extraAttrs.ver = CliqzAttrack.VERSION;
        ts = ts || datetime.getHourTimestamp();
        return generatePayload(data, ts, false, extraAttrs);
    },
    sendTokens: function() {
        // send tokens every 5 minutes
        let data = {},
            hour = datetime.getTime(),
            limit = Object.keys(CliqzAttrack.tokens).length / 12;

        // sort tracker keys by lastSent, i.e. send oldest data first
        let sortedTrackers = Object.keys(CliqzAttrack.tokens).sort((a, b) => {
            return parseInt(CliqzAttrack.tokens[a].lastSent || 0) - parseInt(CliqzAttrack.tokens[b].lastSent || 0)
        });

        for (let i in sortedTrackers) {
            let tracker = sortedTrackers[i];

            if (limit > 0 && Object.keys(data).length > limit) {
                break;
            }

            let tokenData = CliqzAttrack.tokens[tracker];
            if (!(tokenData.lastSent) || tokenData.lastSent < hour) {
                delete(tokenData.lastSent);
                data[tracker] = anonymizeTrackerTokens(tokenData);
                delete(CliqzAttrack.tokens[tracker]);
            }
        }

        if (Object.keys(data).length > 0) {
            const compress = compressionAvailable();

            splitTelemetryData(data, 20000).map((d) => {
                const payl = CliqzAttrack.generateAttrackPayload(d);
                const msg = {
                    'type': telemetry.msgType,
                    'action': 'attrack.tokens',
                    'payload': payl
                };
                if ( compress ) {
                    msg.compressed = true;
                    msg.payload = compressJSONToBase64(payl);
                }
                telemetry.telemetry(msg);
            });
        }
        CliqzAttrack._tokens.setDirty();
    },
    hourChanged: function() {
        // trigger other hourly events
        events.pub("attrack:hour_changed");
    },
    updateConfig: function() {
        var today = datetime.getTime().substring(0, 10);
        utils.httpGet(CliqzAttrack.VERSIONCHECK_URL +"?"+ today, function(req) {
            // on load
            var versioncheck = JSON.parse(req.response);

            // config in versioncheck
            if (versioncheck.placeHolder) {
                persist.setValue('placeHolder', versioncheck.placeHolder);
                CliqzAttrack.placeHolder = versioncheck.placeHolder;
            }

            if (versioncheck.shortTokenLength) {
                persist.setValue('shortTokenLength', versioncheck.shortTokenLength);
                CliqzAttrack.shortTokenLength = parseInt(versioncheck.shortTokenLength) || CliqzAttrack.shortTokenLength;
            }

            if (versioncheck.safekeyValuesThreshold) {
                persist.setValue('safekeyValuesThreshold', versioncheck.safekeyValuesThreshold);
                CliqzAttrack.safekeyValuesThreshold = parseInt(versioncheck.safekeyValuesThreshold) || CliqzAttrack.safekeyValuesThreshold;
            }

            if (versioncheck.cliqzHeader) {
                persist.setValue('cliqzHeader', versioncheck.cliqzHeader);
                CliqzAttrack.cliqzHeader = versioncheck.cliqzHeader;
            }

            // fire events for list update
            events.pub("attrack:updated_config", versioncheck);
        }, utils.log, 10000);
    },
    pruneRequestKeyValue: function() {
        var day = datetime.newUTCDate();
        day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
        var dayCutoff  = datetime.dateString(day);
        for (var s in CliqzAttrack.requestKeyValue) {
            for (var key in CliqzAttrack.requestKeyValue[s]) {
                for (var tok in CliqzAttrack.requestKeyValue[s][key]) {
                    if (CliqzAttrack.requestKeyValue[s][key][tok] < dayCutoff) {
                        delete CliqzAttrack.requestKeyValue[s][key][tok];
                    }
                }
                if (Object.keys(CliqzAttrack.requestKeyValue[s][key]).length == 0) {
                    delete CliqzAttrack.requestKeyValue[s][key];
                }
            }
            if (Object.keys(CliqzAttrack.requestKeyValue[s]).length == 0) {
                delete CliqzAttrack.requestKeyValue[s];
            }
        }
        CliqzAttrack._requestKeyValue.setDirty();
        CliqzAttrack._requestKeyValue.save();
    },
    loadBlockRules: function() {
        CliqzAttrack.qsBlockRule = [];
        CliqzUtils.loadResource(CliqzAttrack.URL_BLOCK_RULES, function(req) {
            try {
                CliqzAttrack.qsBlockRule = JSON.parse(req.response);
            } catch(e) {
                CliqzAttrack.qsBlockRule = [];
            }
        });
    },
    isInWhitelist: function(domain) {
        if(!CliqzAttrack.whitelist) return false;
        var keys = CliqzAttrack.whitelist;
        for(var i=0;i<keys.length;i++) {
            var ind = domain.indexOf(keys[i]);
            if (ind>=0) {
                if ((ind+keys[i].length) == domain.length) return true;
            }
        }
        return false;
    },
    checkTokens: function(url_parts, source_url, cookievalue, stats, source_url_parts) {
        // bad tokens will still be returned in the same format

        var s = getGeneralDomain(url_parts.hostname);
        s = md5(s).substr(0, 16);
        // If it's a rare 3rd party, we don't do the rest
        if (!CliqzAttrack.qs_whitelist.isTrackerDomain(s)) return [];

        var sourceD = md5(source_url_parts.hostname).substr(0, 16);
        var today = datetime.getTime().substr(0, 8);

        if (url_parts['query'].length == 0 && url_parts['parameters'].length == 0) return [];
        var tok;

        var badTokens = [];

        // stats keys
        ['cookie', 'private', 'cookie_b64', 'private_b64', 'safekey', 'whitelisted',
         'cookie_newToken', 'cookie_countThreshold', 'private_newToken', 'private_countThreshold',
         'short_no_hash', 'cookie_b64_newToken', 'cookie_b64_countThreshold', 'private_b64_newToken',
         'private_b64_countThreshold', 'qs_newToken', 'qs_countThreshold', ].forEach(function(k) {stats[k] = 0;});

        var _countCheck = function(tok) {
            // for token length < 12 and may be not a hash, we let it pass
            if (tok.length < 12 && !CliqzAttrack.hashProb.isHash(tok))
                return 0;
            // update tokenDomain
            tok = md5(tok);
            CliqzAttrack.blockLog.tokenDomain.addTokenOnFirstParty(tok, sourceD);
            return CliqzAttrack.blockLog.tokenDomain.getNFirstPartiesForToken(tok);
        };

        var _incrStats = function(cc, prefix, tok, key, val) {
            if (cc == 0)
                stats['short_no_hash']++;
            else if (cc < CliqzAttrack.tokenDomainCountThreshold)
                stats[prefix+'_newToken']++;
            else {
                _addBlockLog(s, key, val, prefix);
                badTokens.push(val);
                if (cc == CliqzAttrack.tokenDomainCountThreshold)
                    stats[prefix + '_countThreshold']++;
                stats[prefix]++;
                return true;
            }
            return false;
        };

        var _addBlockLog = (s, key, val, prefix) => {
            CliqzAttrack.blockLog.blockLog.add(source_url, s, key, val, prefix);
        }

        var _checkTokens = function(key, val) {
            CliqzAttrack.blockLog.incrementCheckedTokens();

            var tok = dURIC(val);
            while (tok != dURIC(tok)) {
                tok = dURIC(tok);
            }

            if (tok.length < CliqzAttrack.shortTokenLength || source_url.indexOf(tok) > -1) return;

            // Bad values (cookies)
            for (var c in cookievalue) {
                if ((tok.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) || c.indexOf(tok) > -1) {
                    if (CliqzAttrack.debug) CliqzUtils.log('same value as cookie ' + val, 'tokk');
                    var cc = _countCheck(tok);
                    if (c != tok) {
                        cc = Math.max(cc, _countCheck(c));
                    }
                    if (_incrStats(cc, 'cookie', tok, key, val))
                        return;
                }
            }

            // private value (from js function returns)
            for (var c in CliqzAttrack.privateValues) {
                if ((tok.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) || c.indexOf(tok) > -1) {
                    if (CliqzAttrack.debug) CliqzUtils.log('same private values ' + val, 'tokk');
                    var cc = _countCheck(tok);
                    if (c != tok) {
                        cc = Math.max(cc, _countCheck(c));
                    }
                    if (_incrStats(cc, 'private', tok, key, val))
                        return;
                }
            }
            var b64 = null;
            try {
                b64 = atob(tok);
            } catch(e) {
            }
            if (b64 != null) {
                for (var c in cookievalue) {
                    if ((b64.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) || c.indexOf(b64) > -1) {
                        if (CliqzAttrack.debug) CliqzUtils.log('same value as cookie ' + b64, 'tokk-b64');
                        var cc = _countCheck(tok);
                        if (c != tok) {
                            cc = Math.max(cc, _countCheck(c));
                        }
                        if (_incrStats(cc, 'cookie_b64', tok, key, val))
                            return;
                    }
                }
                for (var c in CliqzAttrack.privateValues) {
                    if (b64.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) {
                        if (CliqzAttrack.debug) CliqzUtils.log('same private values ' + b64, 'tokk-b64');
                        var cc = _countCheck(tok);
                        if (c != tok) {
                            cc = Math.max(cc, _countCheck(c));
                        }
                        if (_incrStats(cc, 'private_b64', tok, key, val))
                            return;
                    }
                }
            }


            // Good keys.
            if (CliqzAttrack.qs_whitelist.isSafeKey(s, md5(key))) {
                stats['safekey']++;
                return;
            }

            if (source_url.indexOf(tok) == -1) {
                if (!CliqzAttrack.qs_whitelist.isSafeToken(s, md5(tok))) {
                    var cc = _countCheck(tok);
                    _incrStats(cc, 'qs', tok, key, val);
                } else
                    stats['whitelisted']++;
            }
        };

        url_parts.getKeyValues().forEach(function (kv) {
          _checkTokens(kv.k, kv.v);
        });

        // update blockedToken
        CliqzAttrack.blockLog.incrementBlockedTokens(badTokens.length);
        return badTokens;
    },
    examineTokens: function(url_parts) {
        var day = datetime.newUTCDate();
        var today = datetime.dateString(day);
        // save appeared tokens with field name
        // mark field name as "safe" if different values appears
        var s = getGeneralDomain(url_parts.hostname);
        s = md5(s).substr(0, 16);
        url_parts.getKeyValuesMD5().filter(function (kv) {
          return kv.v_len >= CliqzAttrack.shortTokenLength;
        }).forEach(function (kv) {
            var key = kv.k,
                tok = kv.v;
            if (CliqzAttrack.qs_whitelist.isSafeKey(s, key))
                return;
            if (CliqzAttrack.requestKeyValue[s] == null)
                CliqzAttrack.requestKeyValue[s] = {};
            if (CliqzAttrack.requestKeyValue[s][key] == null)
                CliqzAttrack.requestKeyValue[s][key] = {};

            CliqzAttrack.requestKeyValue[s][key][tok] = today;
            // see at least 3 different value until it's safe
            let valueCount = Object.keys(CliqzAttrack.requestKeyValue[s][key]).length
            if ( valueCount > CliqzAttrack.safekeyValuesThreshold ) {
                CliqzAttrack.qs_whitelist.addSafeKey(s, key, valueCount);
                // keep the last seen token
                CliqzAttrack.requestKeyValue[s][key] = {tok: today};
            }
            CliqzAttrack._requestKeyValue.setDirty();
        });
    },
    extractKeyTokens: function(url_parts, refstr, isPrivate, callback) {
        // keys, value of query strings will be sent in md5
        // url, refstr will be sent in half of md5
        if (isPrivate) {
          return;
        }
        var keyTokens = url_parts.getKeyValuesMD5();
        if (keyTokens.length > 0) {
            var s = md5(url_parts.hostname).substr(0, 16);
            refstr = md5(refstr).substr(0, 16);
            callback(s, keyTokens, refstr, isPrivate);
        }
    },
    saveKeyTokens: function(s, keyTokens, r, isPrivate) {
        if (isPrivate) {
          return;
        }
        // anything here should already be hash
        if (CliqzAttrack.tokens[s] == null) CliqzAttrack.tokens[s] = {lastSent: datetime.getTime()};
        if (CliqzAttrack.tokens[s][r] == null) CliqzAttrack.tokens[s][r] = {'c': 0, 'kv': {}};
        CliqzAttrack.tokens[s][r]['c'] =  (CliqzAttrack.tokens[s][r]['c'] || 0) + 1;
        for (var kv of keyTokens) {
            var tok = kv.v,
                k = kv.k;
            if (CliqzAttrack.tokens[s][r]['kv'][k] == null) CliqzAttrack.tokens[s][r]['kv'][k] = {};
            if (CliqzAttrack.tokens[s][r]['kv'][k][tok] == null) {
                CliqzAttrack.tokens[s][r]['kv'][k][tok] = {
                    c: 0,
                    k_len: kv.k_len,
                    v_len: kv.v_len
                };
            }
            CliqzAttrack.tokens[s][r]['kv'][k][tok].c += 1;
        }
        CliqzAttrack._tokens.setDirty();
    },
    linksRecorded: {}, // cache when we recorded links for each url
    recordLinksForURL(url) {
      if (CliqzAttrack.loadedTabs[url]) {
        return;
      }
      const now = Date.now();
      const lastQuery = CliqzAttrack.linksRecorded[url] || 0;
      if (now - lastQuery < 1000) {
        return
      }
      CliqzAttrack.linksRecorded[url] = now;
      return Promise.all([

        core.getCookie(url).then(
          cookie => CliqzAttrack.cookiesFromDom[url] = cookie
        ),

        Promise.all([
          core.queryHTML(url, 'a[href]', 'href'),
          core.queryHTML(url, 'link[href]', 'href'),
          core.queryHTML(url, 'script[src]', 'src').then(function (hrefs) {
            return hrefs.filter( href => href.indexOf('http') === 0 );
          }),
        ]).then(function (reflinks) {
          var hrefSet = reflinks.reduce((hrefSet, hrefs) => {
            hrefs.forEach( href => hrefSet[href] = true );
            return hrefSet;
          }, {});

          CliqzAttrack.linksFromDom[url] = hrefSet;
        })

      ]);
    },
    clearDomLinks: function() {
        for (var url in CliqzAttrack.linksFromDom) {
            if (!CliqzAttrack.isTabURL(url)) {
                delete CliqzAttrack.linksFromDom[url];
                delete CliqzAttrack.cookiesFromDom[url];
                delete CliqzAttrack.loadedTabs[url];
            }
        }
    },
    isTabURL: function(url) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator);
        var browserEnumerator = wm.getEnumerator("navigator:browser");

        while (browserEnumerator.hasMoreElements()) {
            var browserWin = browserEnumerator.getNext();
            var tabbrowser = browserWin.gBrowser;

            var numTabs = tabbrowser.browsers.length;
            for (var index = 0; index < numTabs; index++) {
                var currentBrowser = tabbrowser.getBrowserAtIndex(index);
                if (currentBrowser) {
                    var tabURL = currentBrowser.currentURI.spec;
                    if (url == tabURL || url == tabURL.split('#')[0]) {
                        return true;
                    }
                }
            }
        }
        return false;
    },
    // Listens for requests initiated in tabs.
    // Allows us to track tab windowIDs to urls.
    tab_listener: {
        _tabsStatus: {},

        onStateChange: function(evnt) {
            let {urlSpec, isNewPage, windowID} = evnt;
            // check flags for started request
            if (isNewPage && urlSpec && windowID && urlSpec.startsWith('http')) {
                // add window -> url pair to tab cache.
                this._tabsStatus[windowID] = urlSpec;
                var _key = windowID + ":" + urlSpec;
                if(!(CliqzAttrack.trackReload[_key])) {
                    CliqzAttrack.trackReload[_key] = new Date();
                } else {
                    var t2 = new Date();
                    var dur = (t2 -  CliqzAttrack.trackReload[_key]) / 1000;
                    if(dur < 30000 && countReload && windowID in CliqzAttrack.tp_events._active){
                        CliqzAttrack.tp_events._active[windowID]['ra'] = 1;
                        CliqzAttrack.reloadWhiteList[_key] = t2;
                    }
                }
                countReload = false;
            }
        },

        // Get an array of windowIDs for tabs which a currently on the given URL.
        getTabsForURL: function(url) {
            var tabs = [];
            for(var windowID in this._tabsStatus) {
                var tabURL = this._tabsStatus[windowID];
                if (url == tabURL || url == tabURL.split('#')[0]) {
                    tabs.push(windowID);
                }
            }
            return tabs;
        },

        cleanTabsStatus: function() {
          for (let tabId of Object.keys(this._tabsStatus)) {
            if (! this.isWindowActive(tabId) ) {
              delete this._tabsStatus[tabId];
            }
          }
        },

        isWindowActive: browser.isWindowActive

    },
    /** Get info about trackers and blocking done in a specified tab.
     *
     *  Returns an object describing anti-tracking actions for this page, with keys as follows:
     *    cookies: 'allowed' and 'blocked' counts.
     *    requests: 'safe' and 'unsafe' counts. 'Unsafe' means that unsafe data was seen in a request to a tracker.
     *    trackers: more detailed information about each tracker. Object with keys being tracker domain and values
     *        more detailed blocking data.
     */
    getTabBlockingInfo: function(tabId, url) {
      var result = {
          tab: tabId,
          hostname: '',
          path: '',
          cookies: {allowed: 0, blocked: 0},
          requests: {safe: 0, unsafe: 0},
          trackers: {},
          companies: {},
          ps: null
        };

      // ignore special tabs
      if (url && (url.indexOf('about') == 0 || url.indexOf('chrome') == 0)) {
        result.error = 'Special tab';
        return result;
      }

      if (!(tabId in CliqzAttrack.tp_events._active)) {
        // no tp event, but 'active' tab = must reload for data
        // otherwise -> system tab
        if (browser.isWindowActive(tabId)) {
          result.reload = true;
        }
        result.error = 'No Data';
        return result;
      }

      var tabData = CliqzAttrack.tp_events._active[tabId],
        trackers = Object.keys(tabData.tps).filter(function(domain) {
          return CliqzAttrack.qs_whitelist.isTrackerDomain(md5(getGeneralDomain(domain)).substring(0, 16));
        }),
        plain_data = tabData.asPlainObject(),
        firstPartyCompany = CliqzAttrack.tracker_companies[getGeneralDomain(tabData.hostname)];
      result.hostname = tabData.hostname;
      result.path = tabData.path;
      result.ps = PrivacyScore.get(md5(getGeneralDomain(result.hostname)).substr(0, 16) + 'site');
      if (!result.ps.score) {
        result.ps.getPrivacyScore();
      }

      trackers.forEach(function(dom) {
        result.trackers[dom] = {};
        ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs', 'tokens_blocked', 'req_aborted'].forEach(function (k) {
          result.trackers[dom][k] = plain_data.tps[dom][k] || 0;
        });
        result.cookies.allowed += result.trackers[dom]['cookie_set'] - result.trackers[dom]['cookie_blocked'];
        result.cookies.blocked += result.trackers[dom]['cookie_blocked'];
        result.requests.safe += result.trackers[dom]['c'] - result.trackers[dom]['bad_qs'];
        result.requests.unsafe += result.trackers[dom]['bad_qs'];

        let tld = getGeneralDomain(dom),
          company = tld;
        // find the company behind this tracker. I
        // If the first party is from a tracker company, then do not add the company so that the actual tlds will be shown in the list
        if (tld in CliqzAttrack.tracker_companies && CliqzAttrack.tracker_companies[tld] !== firstPartyCompany) {
          company = CliqzAttrack.tracker_companies[tld];
        }
        if (!(company in result.companies)) {
          result.companies[company] = [];
        }
        result.companies[company].push(dom);
      });

      return result;
    },
    getCurrentTabBlockingInfo: function() {
      var tabId, urlForTab;
      try {
        var gBrowser = CliqzUtils.getWindow().gBrowser,
            selectedBrowser = gBrowser.selectedBrowser;
        // on FF < 38 selectBrowser.outerWindowID is undefined, so we get the windowID from _loadContext
        tabId = selectedBrowser.outerWindowID || selectedBrowser._loadContext.DOMWindowID;
        urlForTab = selectedBrowser.currentURI.spec;
      } catch (e) {
      }
      return CliqzAttrack.getTabBlockingInfo(tabId, urlForTab);
    },
    tracker_companies: {},
    /** Parse tracker owners list {Company: [list, of, domains]}, into lookup table {domain: Company}
     */
    _parseTrackerCompanies: function(company_list) {
      var rev_list = {};
      for (var company in company_list) {
        company_list[company].forEach(function(d) {
          rev_list[d] = company;
        });
      }
      CliqzAttrack.tracker_companies = rev_list;
    },
    /** Enables Attrack module with cookie, QS and referrer protection enabled.
     *  if module_only is set to true, will not set preferences for cookie, QS and referrer protection (for selective loading in AB tests)
     */
    enableModule: function(module_only) {
      if (CliqzAttrack.isEnabled()) {
          return;
      }
      CliqzUtils.setPref(CliqzAttrack.ENABLE_PREF, true);
      if (!module_only) {
        CliqzUtils.setPref('attrackBlockCookieTracking', true);
        CliqzUtils.setPref('attrackRemoveQueryStringTracking', true);
      }
    },
    /** Disables anti-tracking immediately.
     */
    disableModule: function() {
      CliqzUtils.setPref(CliqzAttrack.ENABLE_PREF, false);
    },
    disabled_sites: new Set(),
    DISABLED_SITES_PREF: "attrackSourceDomainWhitelist",
    saveSourceDomainWhitelist: function() {
      CliqzUtils.setPref(CliqzAttrack.DISABLED_SITES_PREF,
        JSON.stringify(Array.from(CliqzAttrack.disabled_sites)));
    },
    isSourceWhitelisted: function(hostname) {
        return CliqzAttrack.disabled_sites.has(hostname);
    },
    addSourceDomainToWhitelist: function(domain) {
      CliqzAttrack.disabled_sites.add(domain);
      // also send domain to humanweb
      telemetry.telemetry({
        'type': telemetry.msgType,
        'action': 'attrack.whitelistDomain',
        'payload': domain
      });
      CliqzAttrack.saveSourceDomainWhitelist();
    },
    removeSourceDomainFromWhitelist: function(domain) {
      CliqzAttrack.disabled_sites.delete(domain);
      CliqzAttrack.saveSourceDomainWhitelist();
    }
};

export default CliqzAttrack;
