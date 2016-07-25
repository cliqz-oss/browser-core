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

// we keep a different preferences namespace than cliqz so that it does not get
// removed after a re-install or sent during a logging signal
var CliqzLanguage = {
    DOMAIN_THRESHOLD: 3,
    READING_THRESHOLD: 10000,
    LOG_KEY: 'CliqzLanguage',
    LOCALE_HASH: 333,
    currentState: {},
    useragentPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('general.useragent.'),

    _locale: null,
    cron: 24*60 * 60 * 1000, // default one day
    checkInterval: 5 * 60 * 1000, // default 5 min
    removeHashId: null,

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

    // load from the about:config settings
    init: function(window) {

        CliqzLanguage.window = window;
        if (this.removeHashId == null){
            this.removeHashId = CliqzUtils.setInterval(this.updateTicker.bind(this), this.checkInterval);
        }

        if(CliqzUtils.hasPref('data','extensions.cliqz-lang.')) {
            try {
                // catch empty value or malformed json
                CliqzLanguage.currentState = JSON.parse(
                    CliqzUtils.getPref('data', {}, 'extensions.cliqz-lang.'));
            }
            catch (e) {
            }
        }
        let localeLangs = [];
        let max_value = 0;
        // transform legacy data
        for (let lang in CliqzLanguage.currentState) {
            if (CliqzLanguage.currentState[lang] == 'locale' || CliqzLanguage.currentState[lang].indexOf(257)!=-1) {
                localeLangs.push(lang);
            }
            if (CliqzLanguage.currentState[lang] instanceof Array){
                max_value = Math.max(max_value, CliqzLanguage.currentState[lang].length);
            }
        }
        if (localeLangs.length) {
            let max_len = Math.max(CliqzLanguage.DOMAIN_THRESHOLD + 1, max_value);

            for (let locale of localeLangs) {
                var original_array = CliqzLanguage.currentState[locale];
                if (original_array == "locale"){

                    CliqzLanguage.currentState[locale] = CliqzLanguage.createHashes(max_len);
                }
                else
                    if (original_array.length < max_len) {
                        CliqzLanguage.currentState[locale] = CliqzLanguage.createHashes(max_len);
                    }

                // add 'locale' hash
                CliqzLanguage.currentState[locale][0] = CliqzLanguage.LOCALE_HASH;

            }
        }

        var ll = CliqzLanguage.getLocale();
        if (ll && CliqzLanguage.currentState[ll]==null) {
            // we found new locale
            CliqzLanguage.currentState[ll] = CliqzLanguage.createHashes(CliqzLanguage.DOMAIN_THRESHOLD + 1);
            // add 'locale' hash
            CliqzLanguage.currentState[ll][0] = CliqzLanguage.LOCALE_HASH;
        }

        CliqzLanguage.cleanCurrentState();
        CliqzLanguage.saveCurrentState();

        CliqzUtils.log(CliqzLanguage.stateToQueryString(), CliqzLanguage.LOG_KEY);

    },
    unload: function () {
        if (this.removeHashId != null){
            CliqzUtils.clearInterval(this.removeHashId);
            this.removeHashId = null;
        }

    },
    updateTicker: function(){
        var lastUpdate = 0;
        if(CliqzUtils.hasPref('lastUpdate','extensions.cliqz-lang.')) {
            try {
                lastUpdate = parseInt(CliqzUtils.getPref('lastUpdate', 0, 'extensions.cliqz-lang.'));
            }
            catch(e){
                lastUpdate = 0;
            }
        }
        var currentTime = Date.now();
        if ( currentTime > this.cron + lastUpdate ) {
            this.removeHash();
            CliqzUtils.setPref('lastUpdate', String(currentTime), 'extensions.cliqz-lang.');
        }
    },
    // create array of unique hashes
    createHashes: function(max_len){
        let hashes = [];
        let i = 0;
        while (i < max_len)
        {
            // random hash value: [-256, 255]
            let r = Math.floor(Math.random() * 512) - 256;
            if (hashes.indexOf(r) == -1){
                hashes.push(r);
                i+=1;
            }
        }
        return hashes;
    },
    // add locale, this is the function hook that will be called for every page load that
    // stays more than 5 seconds active
    addLocale: function(url, localeStr) {

        var locale = CliqzLanguage.normalizeLocale(localeStr);

        if (locale=='' || locale==undefined || locale==null || locale.length != 2) return;
        if (url=='' || url==undefined || url==null) return;

        // extract domain from url, hash it and update the value
        var url_hash = CliqzLanguage.hashCode(CliqzUtils.cleanUrlProtocol(url, true).split('/')[0]) % 256;

        if (CliqzLanguage.currentState[locale]==null || CliqzLanguage.currentState[locale].indexOf(url_hash)==-1) {
            if (CliqzLanguage.currentState[locale]==null) CliqzLanguage.currentState[locale] = [];
            CliqzLanguage.currentState[locale].push(url_hash);
            CliqzUtils.log('Saving: ' + locale + ' ' + url_hash, CliqzLanguage.LOG_KEY + " for url " + url);
            CliqzLanguage.saveCurrentState();
        }
    },
    // do random delete of hash with prob 0.05 (5%)
    removeHash: function () {
        let changed = false;
        for (let lang in CliqzLanguage.currentState) {
            if (CliqzLanguage.currentState[lang].length > (CliqzLanguage.DOMAIN_THRESHOLD + 1)){
                let prob = Math.random();
                if (prob <= 0.05){
                    let ind = Math.floor(Math.random() * CliqzLanguage.currentState[lang].length);
                    if (CliqzLanguage.currentState[lang][ind] != CliqzLanguage.LOCALE_HASH)
                    {
                        if (!changed) changed = !changed;
                        CliqzUtils.log("Removing hash " + CliqzLanguage.currentState[lang][ind] +
                            " for the language " + lang);
                        CliqzLanguage.currentState[lang].splice(ind, 1);
                    }
                }
            }
        }
        if (changed) CliqzLanguage.saveCurrentState();
    },
    // returns hash of the string
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    // removes the country from the locale, for instance, de-de => de, en-US => en
    normalizeLocale: function(str) {
        if (str) return str.split(/-|_/)[0].trim().toLowerCase();
        else return str;
    },
    // the function that decided which languages the person understands
    state: function(distribution) {
        distribution = typeof distribution !== 'undefined' ? distribution : false;
        var lang_vec = [];
        for (var lang in CliqzLanguage.currentState) {
            var len = Object.keys(CliqzLanguage.currentState[lang]).length;
            if (len > CliqzLanguage.DOMAIN_THRESHOLD) {
                lang_vec.push([lang, 1.0/len]);
            }
        }

        lang_vec = lang_vec.sort(function(a, b){
            return a[1]-b[1];
        });
        // returns full distribution if asked for it
        if (distribution){
            return lang_vec;
        }

        // returns only lang names
        var lang_vec_clean = [];
        for (let index in lang_vec) {
            lang_vec_clean.push(lang_vec[index][0]);
        }

        return lang_vec_clean;
    },
    // remove doubled values, normalize languages
    cleanCurrentState: function() {
        var keys = Object.keys(CliqzLanguage.currentState);
        var cleanState = {};
        for(let i=0;i<keys.length;i++) {
            var nkey = CliqzLanguage.normalizeLocale(keys[i]);
            cleanState[nkey] = (cleanState[nkey] || []);

            for(let j=0;j<CliqzLanguage.currentState[keys[i]].length;j++) {
                var value = CliqzLanguage.currentState[keys[i]][j];
                if (cleanState[nkey].indexOf(value)==-1) cleanState[nkey].push(value);
            }
        }
        if (cleanState != CliqzLanguage.currentState) {
            CliqzLanguage.currentState = cleanState;
            CliqzLanguage.saveCurrentState();
        }
    },
    // returns query string with popular languages
    stateToQueryString: function() {
        return '&lang=' + encodeURIComponent(CliqzLanguage.state().join(','));
    },
    // Save the current state to preferences,
    saveCurrentState: function() {
        CliqzUtils.log("Going to save languages: " + JSON.stringify(CliqzLanguage.currentState), CliqzLanguage.LOG_KEY);
        CliqzUtils.setPref('data',
                           JSON.stringify(CliqzLanguage.currentState || {}),
                           'extensions.cliqz-lang.');
    }
};
