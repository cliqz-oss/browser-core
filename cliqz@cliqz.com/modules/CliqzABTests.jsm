'use strict';
/*
 * This module implements a mechanism which enables/disables AB tests
 *
 */

var EXPORTED_SYMBOLS = ['CliqzABTests'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzABTests = CliqzABTests || {
    PREF: 'ABTests',
    PREF_OVERRIDE: 'ABTestsOverride',
    URL: 'https://logging.cliqz.com/abtests/check?session=',

    // Accessors to list of tests this user is current in
    getCurrent: function() {
        if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF))
            return JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));
        return undefined;
    },
    setCurrent: function(tests) {
        CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(tests))
    },

    // Accessors to list of tests in override list
    getOverride: function() {
        if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF_OVERRIDE)) {
            var ABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF_OVERRIDE));
            return ABtests;
        }
        return undefined;
    },
    setOverride: function(tests) {
        if(tests)
            CliqzUtils.setPref(CliqzABTests.PREF_OVERRIDE, JSON.stringify(tests));
        else
            CliqzUtils.cliqzPrefs.clearUserPref(CliqzABTests.PREF_OVERRIDE);
    },

    // Check for newest list of AB tests from server
    check: function() {
        CliqzABTests.retrieve(
            function(response){
                try{
                    var prevABtests = {};
                    if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF))
                        prevABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

                    var respABtests = JSON.parse(response.responseText);

                    // Override the backend response - for local testing
                    var overrideABtests = CliqzABTests.getOverride();
                    if(overrideABtests)
                        respABtests = overrideABtests;

                    var newABtests = {};

                    var changes = false; // any changes?

                    // find old AB tests to leave
                    for(let o in prevABtests) {
                        if(!respABtests[o]) {
                            if(CliqzABTests.leave(o))
                                changes = true;
                        }
                        else {
                            // keep this old test in the list of current tests
                            newABtests[o] = prevABtests[o]
                        }
                    }

                    // find new AB tests to enter
                    for(let n in respABtests) {
                        if(!(prevABtests[n])) {
                            if(CliqzABTests.enter(n, respABtests[n])) {
                                changes = true;
                                newABtests[n] = respABtests[n];
                            }
                        }
                    }

                    if(changes) {
                        CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(newABtests))
                    }
                } catch(e){
                    //CliqzUtils.log(e, "CliqzABTests.check Error");
                }
            });
    },
    retrieve: function(callback) {
        var url = CliqzABTests.URL + encodeURIComponent(CliqzUtils.getPref('session',''));

        var onerror = function(){ CliqzUtils.log("failed to get AB test data",
                                                 "CliqzABTests.retrieve") }

        CliqzUtils.httpGet(url, callback, onerror, 15000);
    },
    enter: function(abtest, payload) {
        var logname = "CliqzABTests.enter"

        // Add new AB tests here.
        // It is safe to remove them as soon as the test is over.
        var rule_executed = true
        switch(abtest) {
            case "1016_A":
                CliqzUtils.setPref("localSpellCheck", true);
                break;
            case "1017_A":
                CliqzUtils.setPref("safeBrowsing", true);
                break;
            case "1019_A":
                CliqzUtils.setPref("newHistory", false);
                break;
            case "1019_B":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_no_cluster");
                break;

            case "1020_A":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_no_cluster");
                break;
            case "1020_B":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_cluster");
                break;

            case "1021_A":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_cluster");
                break;
            case "1021_B":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "cliqz");

            case "1022_A":
                CliqzUtils.setPref("newAutocomplete", false);
                break;
            case "1022_B":
                CliqzUtils.setPref("newAutocomplete", true);
                break;

            case "1023_A":
                CliqzUtils.setPref("localSpellCheck", false);
                break;
            case "1023_B":
                CliqzUtils.setPref("localSpellCheck", true);
                break;
            case "1024_B":
                CliqzUtils.setPref("categoryAssessment", true);
                break;
            case "1025_B":
                //CliqzUtils.setPref("safeBrowsingMoz", true);
                break;
            case "1027_A":
                CliqzUtils.setPref("news-toggle", false);
                break;
            case "1027_B":
                CliqzUtils.setPref("news-toggle", true);
                break;
            case "1028_A":
                CliqzUtils.setPref("humanWeb", false);
                break;
            case "1028_B":
                CliqzUtils.setPref("humanWeb", true);
                break;
            case "1029_A":
                CliqzUtils.setPref("enableNewsCustomization", false);
                break;
            case "1029_B":
                CliqzUtils.setPref("enableNewsCustomization", true);
                break;
            case "1030_A":
                CliqzUtils.setPref("double-enter", false);
                break;
            case "1030_B":
                CliqzUtils.setPref("double-enter", true);
                break;
            case "1031_A":
                CliqzUtils.setPref("topSites", false);
                break;
            case "1031_B":
                CliqzUtils.setPref("topSites", true);
                break;
            case "1032_A":
                CliqzUtils.setPref("spellCorrMessage", false);
                break;
            case "1032_B":
                CliqzUtils.setPref("spellCorrMessage", true);
                break;
            case "1033_A":
                CliqzUtils.setPref("historyStats", false);
                break;
            case "1033_B":
                CliqzUtils.setPref("historyStats", true);
                break;
            case "1034_A":
                CliqzUtils.setPref("safeBrowsingMozTest", false);
                break;
            case "1034_B":
                CliqzUtils.setPref("safeBrowsingMozTest", true);
                break;
            case "1035_A":
                CliqzUtils.setPref("news-default-latest", true);
                break;
            case "1035_B":
                CliqzUtils.setPref("news-default-latest", false);
                break;
            case "1036_B":
                CliqzUtils.setPref("extended_onboarding_same_result", true);
                break;
            case "1037_A":
                CliqzUtils.setPref("cliqzOpenState", false);
                break;
            case "1037_B":
                CliqzUtils.setPref("cliqzOpenState", true);
                break;
            case "1038_A":
                CliqzUtils.setPref("newsTopsitesAssessment", false);
                break;
            case "1038_B":
                CliqzUtils.setPref("newsTopsitesAssessment", true);
                CliqzUtils.setPref("newsTopsitesAssessmentDone", false);
                break;
            case "1039_A":
                CliqzUtils.setPref("alternative_ez", "");
                break;
            case "1039_B":
                CliqzUtils.setPref("alternative_ez", "none");
                break;
            case "1039_C":
                CliqzUtils.setPref("alternative_ez", "description");
                break;
            case "1040_A":
                CliqzUtils.setPref("simpleHistory", false);
                break;
            case "1040_B":
                CliqzUtils.setPref("simpleHistory", true);
                break;
            case "1041_A":
                CliqzUtils.setPref("extended_onboarding_typed_url", false);
                break;
            case "1041_B":
                CliqzUtils.setPref("extended_onboarding_typed_url", true);
                break;
            case "1042_A":
                CliqzUtils.setPref("extended_onboarding_smart_cliqz", false);
                break;
            case "1042_B":
                CliqzUtils.setPref("extended_onboarding_smart_cliqz", true);
                break;
            case "1043_A":
                CliqzUtils.setPref("topSitesV2", false);
                break;
            case "1043_B":
                CliqzUtils.setPref("topSitesV2", true);
                break;
            case "1044_B":
                CliqzUtils.setPref("newsAssessment", 1);
                break;
            default:
                rule_executed = false;
        }
        if(rule_executed) {
            var action = {
                type: 'abtest',
                action: 'enter',
                name: abtest
            };
            CliqzUtils.telemetry(action);

            return true;
       } else {
            return false;
       }
    },
    leave: function(abtest, disable) {
        var logname = "CliqzABTests.leave"

        // Restore defaults after an AB test is finished.
        // DO NOT remove test cleanup code too quickly, a user
        // might not start the browser for a long time and
        // get stuck in a test if we remove cases too early.
        var rule_executed = true;
        switch(abtest) {
            case "1000_A":
                CliqzUtils.cliqzPrefs.clearUserPref("logTimings");
                break;
            case "1001_A":
            case "1001_B":
            case "1001_C":
                CliqzUtils.cliqzPrefs.clearUserPref("changelogURL");
                CliqzUtils.cliqzPrefs.clearUserPref("showChangelog");
                break;
            case "1002_A":
            case "1003_A":
            case "1003_B":
            case "1004_A":
            case "1004_B":
                // disable clustering + series
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                if(CliqzUtils.cliqzPrefs.prefHasUserValue("old_maxRichResults")){
                    urlbarPrefs.setIntPref("maxRichResults", CliqzUtils.getPref("old_maxRichResults"));
                    CliqzUtils.cliqzPrefs.clearUserPref("old_maxRichResults");
                }

                CliqzUtils.cliqzPrefs.clearUserPref("abCluster");
                break;
            case "1005_B":
                // remove log clustering
                CliqzUtils.cliqzPrefs.clearUserPref('logCluster');
                break;
            case "1006_A":
                // abort http connections if a new one appears
                CliqzUtils.cliqzPrefs.clearUserPref("abortConnections");
                break;
            case "1007_A":
                // run history-based suggester experiment
                CliqzUtils.cliqzPrefs.clearUserPref("historyExperiment");
                break;
            case "1008_A":
                // Do not reset prefs, we want to keep them
                //CliqzUtils.resetOriginalPrefs();
                break;
            case "1009_A":
                CliqzUtils.cliqzPrefs.clearUserPref('sessionExperiment');
                break;
            case "1010_A":
                CliqzUtils.cliqzPrefs.clearUserPref("showNoResults");
                break;
            case "1011_A":
                break;
            case "1012_A":
                break;
            case "1013_A":
                CliqzUtils.cliqzPrefs.clearUserPref("sessionLogging");
                break;
            case "1014_A":
                CliqzUtils.CUSTOM_RESULTS_PROVIDER = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProvider");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderPing");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderLog");
                break;
            case "1015_A":
                CliqzUtils.CUSTOM_RESULTS_PROVIDER = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProvider");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderPing");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderLog");
                break;
            case "1016_A":
                CliqzUtils.cliqzPrefs.clearUserPref("localSpellCheck");
                break;
            case "1017_A":
                CliqzUtils.cliqzPrefs.clearUserPref("safeBrowsing");
                //CliqzUCrawl.outOfABTest();
                break;
            case "1018_A":
            case "1018_B":
                CliqzUtils.cliqzPrefs.clearUserPref("disableSeriesCluster");
                break;
            case "1019_A":
            case "1019_B":
            case "1020_A":
            case "1020_B":
            case "1021_A":
            case "1021_B":
                CliqzUtils.cliqzPrefs.clearUserPref("newHistory");
                CliqzUtils.cliqzPrefs.clearUserPref("newHistoryType");
                break;
            case "1022_A":
            case "1022_B":
                CliqzUtils.cliqzPrefs.clearUserPref("newAutocomplete");
                break;
            case "1023_A":
            case "1023_B":
                CliqzUtils.cliqzPrefs.clearUserPref("localSpellCheck");
                break;
            case "1024_B":
                CliqzUtils.cliqzPrefs.clearUserPref("categoryAssessment");
                break;
            case "1025_B":
                CliqzUtils.cliqzPrefs.clearUserPref("safeBrowsingMoz");
                break;
            case "1027_A":
            case "1027_B":
                CliqzUtils.cliqzPrefs.clearUserPref("news-toggle");
                break;
            case "1028_A":
            case "1028_B":
                CliqzUtils.cliqzPrefs.clearUserPref("humanWeb");
                break;
            case "1029_A":
            case "1029_B":
                CliqzUtils.cliqzPrefs.clearUserPref("enableNewsCustomization");
                break;
            case "1030_A":
            case "1030_B":
                CliqzUtils.cliqzPrefs.clearUserPref("double-enter");
                break;
            case "1031_A":
            case "1031_B":
                CliqzUtils.cliqzPrefs.clearUserPref("topSites");
                break;
            case "1032_A":
            case "1032_B":
                CliqzUtils.cliqzPrefs.clearUserPref("spellCorrMessage");
                break;
            case "1033_A":
            case "1033_B":
                CliqzUtils.cliqzPrefs.clearUserPref("historyStats");
                break;
            case "1034_A":
            case "1034_B":
                CliqzUtils.cliqzPrefs.clearUserPref("safeBrowsingMozTest");
                break;
            case "1035_A":
            case "1035_B":
                CliqzUtils.cliqzPrefs.clearUserPref("news-default-latest");
                break;
            case "1036_A":
            case "1036_B":
                CliqzUtils.cliqzPrefs.clearUserPref("extended_onboarding_same_result");
                CliqzUtils.cliqzPrefs.clearUserPref("extended_onboarding");
                break;
            case "1037_A":
            case "1037_B":
                CliqzUtils.cliqzPrefs.clearUserPref("cliqzOpenState");
                break;
            case "1038_A":
            case "1038_B":
                CliqzUtils.cliqzPrefs.clearUserPref("newsTopsitesAssessment");
                CliqzUtils.cliqzPrefs.clearUserPref("newsTopsitesAssessmentDone");
                break;
            case "1039_A":
            case "1039_B":
            case "1039_C":
                CliqzUtils.cliqzPrefs.clearUserPref("alternative_ez");
                break;
            case "1040_A":
            case "1040_B":
                CliqzUtils.cliqzPrefs.clearUserPref("simpleHistory");
                break;
            case "1041_A":
            case "1041_B":
                CliqzUtils.cliqzPrefs.clearUserPref("extended_onboarding_typed_url");
                break;
            case "1042_A":
            case "1042_B":
                CliqzUtils.cliqzPrefs.clearUserPref("extended_onboarding_smart_cliqz");
                break;
            case "1043_A":
            case "1043_B":
               CliqzUtils.cliqzPrefs.clearUserPref("topSitesV2");
               break;
            case "1044_B":
                CliqzUtils.cliqzPrefs.clearUserPref("newsAssessment");
                break;
            default:
                rule_executed = false;
        }
        if(rule_executed) {
            var action = {
                type: 'abtest',
                action: 'leave',
                name: abtest,
                disable: disable
            };
            CliqzUtils.telemetry(action);
            return true;
       } else {
            return false;
       }
    },
    disable: function(abtest) {
        // Disable an AB test but do not remove it from list of active AB tests,
        // this is intended to be used by the extension itself when it experiences
        // an error associated with this AB test.
        if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF)) {
             var curABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

            if(curABtests[abtest] && CliqzABTests.leave(abtest, true)) {
                // mark as disabled and save back to preferences
                curABtests[abtest].disabled = true;
                CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(curABtests))
            }
        }
    },
}
