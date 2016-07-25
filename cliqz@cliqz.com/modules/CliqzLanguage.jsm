'use strict';
/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzLanguage'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzExtOnboarding',
  'chrome://cliqzmodules/content/CliqzExtOnboarding.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

var CliqzLanguage = {
    DOMAIN_THRESHOLD: 3,
    READING_THRESHOLD: 10000,
    LOG_KEY: 'CliqzLanguage',
    currentState: {},
    // we keep a different namespace than cliqz so that it does not get
    // removed after a re-install or sent during a logging signal
    cliqzLangPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz-lang.'),

    useragentPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('general.useragent.'),

    regexGoogleRef: /\.google\..*?\/(?:url|aclk)\?/,
    regexGoogleQuery: /\.google\..*?[#?&;]q=[^$&]+/,
    regexGoogleAdRef: /\.google\..*?\/aclk\?/,
    regexGoogleRefUrl: /url=(.+?)&/,

    sendCompSignal: function(actionName, redirect, same_result, result_type, result_position, is_ad) {
        var action = {
            type: 'performance',
            redirect: redirect,
            action: actionName,
            query_made: CliqzAutocomplete.afterQueryCount,
            popup: CliqzAutocomplete.lastPopupOpen,
            same_result: same_result,
            result_type: result_type,
            result_position: result_position,
            is_ad: is_ad,
            v: 1
        };
        CliqzUtils.telemetry(action)
    },
    _locale: null,
    getLocale: function(){
        if(!CliqzLanguage._locale){
            var locale = null;
            try {
                // linux systems
                // https://bugzilla.mozilla.org/show_bug.cgi?id=438031
                locale = CliqzLanguage.useragentPrefs.getComplexValue('locale',Components.interfaces.nsIPrefLocalizedString).data
            } catch(e){
                locale = CliqzLanguage.useragentPrefs.getCharPref('locale')
            }
            CliqzLanguage._locale = CliqzLanguage.normalizeLocale(locale);
        }
        return CliqzLanguage._locale;
    },
    listener: {
        currURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {
            if (aURI.spec == this.currentURL ||
                !CliqzAutocomplete.lastResult) return;

            this.currentURL = aURI.spec;

            // here we check if user ignored our results and went to google and landed on the same url
            if (CliqzLanguage.regexGoogleQuery.test(this.currentURL) &&
                !CliqzLanguage.regexGoogleRef.test(this.currentURL)) {
                CliqzAutocomplete.afterQueryCount += 1;
            }

            // now the language detection
            CliqzLanguage.window.setTimeout(function(currURLAtTime) {
                try {
                    if(CliqzLanguage){ //might be called after the extension is disabled
                        var currURL = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument.location;
                        if (''+currURLAtTime == ''+currURL) {
                            // the person has stayed at least READING_THRESHOLD at the URL, now let's try
                            // to fetch the locale
                            // CliqzUtils.log("Person has been long enough at: " + currURLAtTime, CliqzLanguage.LOG_KEY);
                            var locale = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument
                                .getElementsByTagName('html').item(0).getAttribute('lang');
                            if (locale) CliqzLanguage.addLocale(''+currURL,locale);
                        }
                    }
               }
               catch(ee) {
                // silent fail
                //CliqzUtils.log('Exception: ' + ee, CliqzLanguage.LOG_KEY);
               }

            }, CliqzLanguage.READING_THRESHOLD, this.currentURL);
        },
        onStateChange: function(aWebProgress, aRequest, aStateFlag, aStatus) {
            // if completed request without error (status)
            if (aRequest && (aStateFlag && Ci.nsIWebProgressListener.STATE_STOP) && !aStatus) {
                if (CliqzAutocomplete.lastPopupOpen && // if last result set was shown to the user
                    CliqzLanguage.regexGoogleRef.test(aRequest.name)) { // if request is a Google ref
                    // extract referred URL
                    var match = aRequest.name.match(CliqzLanguage.regexGoogleRefUrl);
                    if (match) {
                        var googleUrl = CliqzHistoryPattern.generalizeUrl(decodeURIComponent(match[1])),
                            results = CliqzAutocomplete.lastResult._results,
                            found = false;

                        for (var i = 0; i < results.length; i++) {
                            var cliqzUrl = CliqzHistoryPattern.generalizeUrl(results[i].val);

                            // same result as in dropdown
                            if (googleUrl == cliqzUrl) {
                                var resType = CliqzUtils.encodeResultType(results[i].style || results[i].type);
                                CliqzLanguage.sendCompSignal('result_compare', true, true, resType, i, false);
                                CliqzAutocomplete.afterQueryCount = 0;
                                found = true;

                                CliqzExtOnboarding.onSameResult(aRequest, i, cliqzUrl);
                                break;
                            }
                        }

                        // we don't have the same result
                        if (!found) {
                            CliqzLanguage.sendCompSignal('result_compare', true, false, null, null, false);
                        }
                    } else if(CliqzLanguage.regexGoogleAdRef.test(aRequest.name)) {
                        CliqzLanguage.sendCompSignal('result_compare', true, false, null, null, true);
                    }
                }
            }
        },
    },

    // load from the about:config settings
    init: function(window) {

        CliqzLanguage.window = window;

        if(CliqzLanguage.cliqzLangPrefs.prefHasUserValue('data')) {
            CliqzLanguage.currentState = JSON.parse(CliqzLanguage.cliqzLangPrefs.getCharPref('data'));

            // for the case that the user changes his userAgent.locale
            var ll = CliqzLanguage.getLocale();
            if (ll) {
                if (CliqzLanguage.currentState[ll]!='locale') {
                    CliqzLanguage.currentState[ll] = 'locale';
                    CliqzLanguage.saveCurrentState();
                }
            }
        }
        else {
            // it has nothing, new or removed,

            var ll = CliqzLanguage.getLocale();
            if (ll) {
                CliqzLanguage.currentState = {};
                CliqzLanguage.currentState[ll] = 'locale';
                CliqzLanguage.saveCurrentState();
            }
        }

        CliqzLanguage.cleanCurrentState();
        CliqzUtils.log(CliqzLanguage.stateToQueryString(), CliqzLanguage.LOG_KEY);

    },
    // add locale, this is the function hook that will be called for every page load that
    // stays more than 5 seconds active
    addLocale: function(url, localeStr) {

        var locale = CliqzLanguage.normalizeLocale(localeStr);

        if (locale=='' || locale==undefined || locale==null || locale.length != 2) return;
        if (url=='' || url==undefined || url==null) return;

        if (CliqzLanguage.currentState[locale] != 'locale') {
            // if it's the locale there is not need to do anything, we already have it

            // extract domain from url, hash it and update the value
            var url_hash = CliqzLanguage.hashCode(CliqzUtils.cleanUrlProtocol(url, true).split('/')[0]) % 256;

            CliqzUtils.log('Saving: ' + locale + ' ' + url_hash, CliqzLanguage.LOG_KEY);

            if (CliqzLanguage.currentState[locale]==null || CliqzLanguage.currentState[locale].indexOf(url_hash)==-1) {
                if (CliqzLanguage.currentState[locale]==null) CliqzLanguage.currentState[locale] = [];
                // does not exist
                CliqzLanguage.currentState[locale].push(url_hash);
                CliqzLanguage.saveCurrentState();
            }
        }

    },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    // removes the country from the locale, for instance, de-de => de, en-US => en
    normalizeLocale: function(str) {
        if (str) return str.split(/-|_/)[0].trim().toLowerCase();
        else return srt;
    },
    // the function that decided which languages the person understands
    state: function() {

        var lang_vec = [];
        for (var lang in CliqzLanguage.currentState) {
            if (CliqzLanguage.currentState[lang]=='locale') {
                lang_vec.push([lang, 0.0]);
            }
            else {
                var val = Object.keys(CliqzLanguage.currentState[lang]).length;
                if (val > CliqzLanguage.DOMAIN_THRESHOLD) {
                    lang_vec.push([lang, 1.0/val]);
                }
            }
        }

        lang_vec = lang_vec.sort(function(a, b){
            return a[1]-b[1];
        });

        var lang_vec_clean = [];
        for (var index in lang_vec) {
            lang_vec_clean.push(lang_vec[index][0]);
        }

        return lang_vec_clean;
    },
    cleanCurrentState: function() {
        var keys = Object.keys(CliqzLanguage.currentState);
        var count = 0;
        for(let i=0;i<keys.length;i++) if (keys[i]!=CliqzLanguage.normalizeLocale(keys[i])) count+=1;

        if (count>0) {
            var cleanState = {};
            for(let i=0;i<keys.length;i++) {
                var nkey = CliqzLanguage.normalizeLocale(keys[i]);
                if (CliqzLanguage.currentState[keys[i]]!='locale') {
                    cleanState[nkey] = (cleanState[nkey] || []);

                    for(let j=0;j<CliqzLanguage.currentState[keys[i]].length;j++) {
                        var value = CliqzLanguage.currentState[keys[i]][j];
                        if (cleanState[nkey].indexOf(value)==-1) cleanState[nkey].push(value);
                    }
                }
            }

            CliqzLanguage.currentState = cleanState;
            var ll = CliqzLanguage.getLocale();
            if (ll && CliqzLanguage.currentState[ll]!='locale') CliqzLanguage.currentState[ll] = 'locale';

            CliqzLanguage.saveCurrentState();
        }
    },
    stateToQueryString: function() {
        return '&lang=' + encodeURIComponent(CliqzLanguage.state().join(','));
    },
    // Save the current state to preferences,
    saveCurrentState: function() {
        CliqzUtils.log("Going to save languages: " + JSON.stringify(CliqzLanguage.currentState), CliqzLanguage.LOG_KEY);
        CliqzLanguage.cliqzLangPrefs.setCharPref('data', JSON.stringify(CliqzLanguage.currentState || {}));
    },
};
