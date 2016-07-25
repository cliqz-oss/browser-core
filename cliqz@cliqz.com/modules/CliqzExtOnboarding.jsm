'use strict';
/*
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzExtOnboarding'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');


XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

var prefs = { },
    // cache destination URL
    destUrl = undefined,
    isSmartCliqzReady = false,
    smartCliqzLinks = [],
    smartCliqzStepCounter = 0,
    smartCliqzTs = 0,
    smartCliqzTab = undefined,
    SMART_CLIQZ_LINK_FIELDS = ["actions", "categories", "links", "news"];


// cache autocomplete state
var currentAutocompleteUrlbar = "",
    currentAutocompleteMinSelectionStart = 0;

var CliqzExtOnboarding = {
    TYPED_URL_MIN_CHARS_TYPED: 5,
    SMART_CLIQZ_MAX_STEPS: 3,
    SMART_CLIQZ_MAX_TIME: 30000,
    KEYCODE_ENTER: 13,
    CALLOUT_DOM_ID: "cliqzExtOnboardingCallout",

    REQUIRED_RESULTS_COUNT: {
        "same_result":  4, // 4
        "typed_url":    3, // 3
        "smart_cliqz":  4  // 4
    },
    MAX_INTERRUPTS: {
        "same_result": 3, // 3
        "typed_url":   3, // 3
        "smart_cliqz": 3  // 3
    },

    // show messages regardless of user settings
    DEBUG: false,

    // will be checked on module load
    _isFirefoxVersionSupported: false,
    _calloutParsedContent: { },

    // called for each new window
    init: function (win) {
        CliqzExtOnboarding._log("init: initializing");

        CliqzExtOnboarding._checkFirefoxVersionRequirements();

        var callout = CliqzExtOnboarding._createCallout(win);
        CliqzExtOnboarding._addCalloutListeners(callout);
        CliqzExtOnboarding._addDropdownListeners(win);

        if (CliqzExtOnboarding._isFirefoxVersionSupported &&
            CliqzExtOnboarding._isTypeActive("typed_url")) {
            CliqzExtOnboarding._addUrlbarKeydownListener(win);
        }

        win.gBrowser.addProgressListener(CliqzExtOnboarding.progressListener);

        CliqzExtOnboarding._loadPrefs();
        CliqzExtOnboarding._log("init: done");
    },

    unload: function (win) {
        CliqzExtOnboarding._log("unload: unloading...");

        CliqzExtOnboarding._removeDropdownListeners(win);
        var callout = CliqzExtOnboarding._getCallout(win);
        if (callout) {
            CliqzExtOnboarding._removeCalloutListeners(callout);
            CliqzExtOnboarding._destroyCallout(callout);
        } else {
            CliqzExtOnboarding._log("unload: no callout element found");
        }

        CliqzExtOnboarding._removeUrlbarKeydownListener(win);
        win.gBrowser.removeProgressListener(CliqzExtOnboarding.progressListener);

        smartCliqzTab = undefined;
        CliqzExtOnboarding._log("unload: done");
    },

    onSameResult: function (request, resultIndex, destinationUrl) {
        if (!CliqzExtOnboarding._isTypeActive("same_result")) {
            CliqzExtOnboarding._log("onSameResult: same result AB test not active; aborting");
            return;
        }

        if (!CliqzExtOnboarding._isFirefoxVersionSupported) {
            CliqzExtOnboarding._log("onSameResult: Firefox version not supported");
            return;
        }

        if (!request) {
            CliqzExtOnboarding._log("onSameResult: invalid request; aborting");
            return;
        }

        var _prefs = CliqzExtOnboarding._getPrefs("same_result");
        // for those users who were already in the AB test when
        // "sub_group" was introduced
        if (!_prefs.hasOwnProperty("sub_group")) {
            _prefs["sub_group"] = "na";
        }
        CliqzExtOnboarding._savePrefs("same_result", _prefs);

        if (CliqzExtOnboarding._shouldShowMessage("same_result")) {
            var win = CliqzUtils.getWindow(),
                callout = CliqzExtOnboarding._getCallout(win),
                anchor = win.CLIQZ.Core.popup.cliqzBox.resultsBox.children[resultIndex],
                _prefs = CliqzExtOnboarding._getPrefs("same_result");
            CliqzExtOnboarding._savePrefs("same_result", _prefs);

            if (anchor) {
                if (anchor.offsetTop < win.CLIQZ.UI.DROPDOWN_HEIGHT) {
                    destUrl = destinationUrl;

                    win.CLIQZ.Core.popup._openAutocompletePopup(
                        win.CLIQZ.Core.urlbar, win.CLIQZ.Core.urlbar);
                    CliqzExtOnboarding._setCalloutContent("same_result");
                    callout.openPopup(anchor, "end_before", -5, 0);
                    callout.setAttribute("show_ts", Date.now());
                    callout.setAttribute("msg_type", "same_result");

                    request.cancel("CLIQZ_INTERRUPT");
                    CliqzExtOnboarding._log("interrupted");
                    CliqzExtOnboarding._telemetry("same_result", "show", {
                        count: _prefs["show_count"],
                        result_index: resultIndex
                    });
                }
                else {
                    CliqzExtOnboarding._log("onSameResult: result was below the fold");
                }
            } else {
                CliqzExtOnboarding._log("onSameResult: result was not shown to user");
            }
        }
    },

    progressListener: {
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
        onLocationChange: function(aProgress, aRequest, aURI) {
            if (CliqzExtOnboarding._isFirefoxVersionSupported &&
                CliqzExtOnboarding._isTypeActive("smart_cliqz")) {

                if (CliqzAutocomplete.lastResult && CliqzAutocomplete.lastPopupOpen) {
                    var lastResults = CliqzAutocomplete.lastResult["_results"];
                    if (!CliqzAutocomplete.lastResult.CliqzExtOnboarding_handled) {
                        CliqzExtOnboarding._log("new result");
                        if (CliqzExtOnboarding._containsSmartCliqzResult(lastResults)) {
                            CliqzExtOnboarding._log("SmartCliqz");
                            smartCliqzTs = Date.now();
                            smartCliqzLinks =
                                CliqzExtOnboarding._getSmartCliqzLinks(lastResults[0]);
                            smartCliqzStepCounter = 0;
                            smartCliqzTab = CliqzUtils.getWindow().gBrowser.selectedTab;

                            var url = CliqzHistoryPattern.generalizeUrl(aURI.spec);
                            if (smartCliqzLinks.indexOf(url) >= 0) {
                                isSmartCliqzReady = false;
                                CliqzExtOnboarding._log("first landing was SmartCliqz link, aborting");
                            } else {
                                isSmartCliqzReady = true;
                            }
                        } else {
                            CliqzExtOnboarding._log("regular result");
                            isSmartCliqzReady = false;
                        }
                        CliqzAutocomplete.lastResult.CliqzExtOnboarding_handled = true;
                    } else {
                        CliqzExtOnboarding._log("previous result");
                        if (isSmartCliqzReady) {
                            smartCliqzStepCounter++;
                            CliqzExtOnboarding._log("SmartCliqz ready, step count: " +
                                smartCliqzStepCounter);

                            if (smartCliqzTab != CliqzUtils.getWindow().gBrowser.selectedTab) {
                                CliqzExtOnboarding._log("different tab, aborting");
                                isSmartCliqzReady = false;
                            }
                            else if (smartCliqzStepCounter > CliqzExtOnboarding.SMART_CLIQZ_MAX_STEPS) {
                                CliqzExtOnboarding._log("too many steps, aborting");
                                isSmartCliqzReady = false;
                            } else if (Date.now() - smartCliqzTs > CliqzExtOnboarding.SMART_CLIQZ_MAX_TIME) {
                                CliqzExtOnboarding._log("took too long, aborting");
                                isSmartCliqzReady = false;
                            } else {
                                var url = CliqzHistoryPattern.generalizeUrl(aURI.spec);
                                if (smartCliqzLinks.indexOf(url) >= 0) {
                                    CliqzExtOnboarding._log("url found " + url);
                                    var button = CliqzExtOnboarding._getDomElementForUrl(url);
                                    if (button) {
                                        // check if button is in second row, allowing for some margin tolerance
                                        if (button.offsetTop - button.parentElement.offsetTop > 20) {
                                             CliqzExtOnboarding._log("button not visible, ignoring");
                                        } else if (CliqzExtOnboarding._shouldShowMessage("smart_cliqz")) {
                                            var win = CliqzUtils.getWindow(),
                                                callout = CliqzExtOnboarding._getCallout(win),
                                                _prefs = CliqzExtOnboarding._getPrefs("smart_cliqz");
                                            CliqzExtOnboarding._savePrefs("smart_cliqz", _prefs);

                                            button.classList.add("onboarding-highlight");
                                            win.CLIQZ.Core.popup._openAutocompletePopup(
                                                win.CLIQZ.Core.urlbar, win.CLIQZ.Core.urlbar);
                                            CliqzExtOnboarding._setCalloutContent("smart_cliqz");
                                            callout.setAttribute("show_ts", Date.now());
                                            callout.setAttribute("msg_type", "smart_cliqz");
                                            callout.openPopup(button, "after_start", 10, -5);

                                            CliqzExtOnboarding._telemetry("smart_cliqz", "show", {
                                                count: _prefs["show_count"]
                                            });
                                        }
                                    }
                                    isSmartCliqzReady = false;
                                }
                            }
                        } else {
                            CliqzExtOnboarding._log("no SmartCliqz or already handled");
                        }
                    }
                }
            }
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },

    _getPrefs: function (type) {
        if (!prefs[type]) {
            CliqzExtOnboarding._log("creating prefs for " + type);
            prefs[type] = {
                "state":             "seen",
                "result_count":      0,
                "show_count":        0,
                "max_show_duration": 0,
                "sub_group":         "tbd"
            };
        }
        return prefs[type];
    },

    _savePrefs: function (type, data) {
        prefs[type] = data;
        CliqzUtils.setPref("extended_onboarding",
            JSON.stringify(prefs));
    },

    _isTypeActive: function(type) {
        return CliqzExtOnboarding.DEBUG || CliqzUtils.getPref(
            "extended_onboarding_" + type, false);
    },

    _containsSmartCliqzResult: function (results) {
        return results.length > 0 &&
            results[0].style && results[0].style == "cliqz-extra" &&
            results[0].data;
    },

    _shouldShowMessage: function (type) {
        if (CliqzExtOnboarding.DEBUG) {
            return true;
        }

        var _prefs = CliqzExtOnboarding._getPrefs(type);

        if (_prefs["state"] == "discarded") {
            CliqzExtOnboarding._log(type + ": user discarded before; not interrupting");
            return false;
        } else if (_prefs["show_count"] >= CliqzExtOnboarding.MAX_INTERRUPTS[type]) {
            CliqzExtOnboarding._log(type + ": max. show reached; not interrupting");
            return false;
        } else if (_prefs["result_count"] < CliqzExtOnboarding.REQUIRED_RESULTS_COUNT[type]) {
            _prefs["result_count"]++;
            CliqzExtOnboarding._savePrefs(type, _prefs);
            CliqzExtOnboarding._log(type + ": not enough results; not interrupting");
            return false;
        }

        // decide which subgroup we are going to be in
        if (_prefs["sub_group"] == "tbd") {
            _prefs["sub_group"] = (Math.random(1) < .5) ? "show" : "no_show";
            CliqzExtOnboarding._savePrefs(type, _prefs);
            CliqzExtOnboarding._log(type + ": decided for subgroup " + _prefs["sub_group"]);
        }

        if (_prefs["sub_group"] == "no_show") {
            CliqzExtOnboarding._log(type + ": user is in sub_group no show; not interrupting");
            return false;
        }

        _prefs["result_count"] = 0;
        CliqzExtOnboarding._savePrefs(type, _prefs);
        return true;
    },

    _getSmartCliqzLinks: function (smartCliqz) {
        var links = [];
        var data = smartCliqz.data;
        for (var i in SMART_CLIQZ_LINK_FIELDS) {
            var field = SMART_CLIQZ_LINK_FIELDS[i];
            for (var j in data[field]) {
                var url = data[field][j].url;
                links.push(CliqzHistoryPattern.generalizeUrl(url));
            }
        }
        return links;
    },

    _getAllElementsWithAttribute: function (root, attribute) {
      var matchingElements = [];
      var allElements = root.getElementsByTagName("*");
      for (var i = 0; i < allElements.length; i++){
        if (allElements[i].getAttribute(attribute) !== null) {
          matchingElements.push(allElements[i]);
        }
      }
      return matchingElements;
    },

    _getDomElementForUrl: function (url) {
        var win = CliqzUtils.getWindow();
        if (win.CLIQZ.Core.popup.cliqzBox.resultsBox.children.length > 0) {
            var smartCliqz = win.CLIQZ.Core.popup.cliqzBox.resultsBox.children[0];
            var buttons = CliqzExtOnboarding._getAllElementsWithAttribute(smartCliqz, "url");
            for (var i = 0; i < buttons.length; i++) {
                if (CliqzHistoryPattern.generalizeUrl(buttons[i].getAttribute("url")) == url) {
                    CliqzExtOnboarding._log("found DOM element for " + url);
                    return buttons[i];
                }
            }
        }
        CliqzExtOnboarding._log("no DOM element found for " + url);
        return false;
    },

    _loadPrefs: function () {
        try {
            prefs =
                JSON.parse(CliqzUtils.getPref("extended_onboarding"));
        } catch (e) { }
    },

    _checkFirefoxVersionRequirements: function () {
        try {
            var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                .getService(Components.interfaces.nsIXULAppInfo);
            var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                .getService(Components.interfaces.nsIVersionComparator);

            // running under Firefox 36.0 or later
            if(versionChecker.compare(appInfo.version, "36.0") < 0) {
                CliqzExtOnboarding._log("_checkFirefoxVersionRequirements: requires Firefox 36.0 or higher");
            } else {
                CliqzExtOnboarding._isFirefoxVersionSupported = true;
            }
        } catch (e) {
            CliqzExtOnboarding._log("_checkFirefoxVersionRequirements: unable to check Firefox version");
            return;
        }
    },

    // create callout element and attach to DOM
    _createCallout: function (win) {
        win = win || CliqzUtils.getWindow();

        var callout = win.document.createElement('panel'),
            content = win.document.createElement('div'),
            parent = win.CLIQZ.Core.popup.parentElement;

        callout.className = "onboarding-container";
        content.className = "onboarding-callout";

        callout.setAttribute("id", CliqzExtOnboarding.CALLOUT_DOM_ID);
        callout.setAttribute("type", "arrow");
        callout.setAttribute("level", "top");
        callout.setAttribute("ignorekeys", "true");

        // set HTML content
        CliqzExtOnboarding._initCalloutContent(content);

        callout.appendChild(content);
        parent.appendChild(callout);

        return callout;
    },

    _getCallout: function (win) {
        win = win || CliqzUtils && CliqzUtils.getWindow();

        return win && win.document.getElementById(CliqzExtOnboarding.CALLOUT_DOM_ID)
    },

    _initCalloutContent: function (contentElement) {
        // wait until template has been loaded
        if (!CliqzHandlebars.tplCache["onboarding-callout-extended"]) {
            CliqzUtils.setTimeout(function () {
                CliqzExtOnboarding._initCalloutContent(contentElement);
            }, 250);
            CliqzExtOnboarding._log("_initCalloutContent: templates not ready; waiting");
            return;
        }

        CliqzExtOnboarding._calloutParsedContent["same_result"] = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
            message: CliqzUtils.getLocalizedString("onCalloutSameResult"),
            options: [
                { label:
                    CliqzUtils.getLocalizedString("onCalloutSameResultBtnOk"),
                    action: "onboarding-start", state: "ok" },
                { label:
                    CliqzUtils.getLocalizedString("onCalloutSameResultBtnCancel"),
                    action: "onboarding-cancel", state: "cancel" }
            ],
            cliqz_logo: "chrome://cliqzres/content/skin/img/cliqz.svg"
        });

        CliqzExtOnboarding._calloutParsedContent["typed_url"] = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
            message: CliqzUtils.getLocalizedString("onCalloutTypedUrl"),
            options: [
                { label:
                    CliqzUtils.getLocalizedString("onCalloutTypedUrlBtnOk"),
                    action: "onboarding-start", state: "ok" },
                { label:
                    CliqzUtils.getLocalizedString("onCalloutTypedUrlBtnCancel"),
                    action: "onboarding-cancel", state: "cancel" }
            ],
            cliqz_logo: "chrome://cliqzres/content/skin/img/cliqz.svg"
        });

        CliqzExtOnboarding._calloutParsedContent["smart_cliqz"] = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
            message: CliqzUtils.getLocalizedString("onCalloutSmartCliqz"),
            options: [
                { label:
                    CliqzUtils.getLocalizedString("onCalloutSmartCliqzBtnOk"),
                    action: "onboarding-start", state: "ok" },
                { label:
                    CliqzUtils.getLocalizedString("onCalloutSmartCliqzBtnCancel"),
                    action: "onboarding-cancel", state: "cancel" }
            ],
            cliqz_logo: "chrome://cliqzres/content/skin/img/cliqz.svg"
        });

        CliqzExtOnboarding._log("_initCalloutContent: template parsed");
    },

    _setCalloutContent: function (messageType) {
        var callout = CliqzExtOnboarding._getCallout();
        callout.firstChild.innerHTML =
            CliqzExtOnboarding._calloutParsedContent[messageType];
    },

    _destroyCallout: function (callout) {
        callout.parentNode.removeChild(callout);
    },

    // handle user clicks on ok and cancel buttons
    _addCalloutListeners: function (callout) {
        callout.addEventListener("click", CliqzExtOnboarding._calloutClickListener);
        callout.addEventListener("popuphidden", CliqzExtOnboarding._calloutCloseListener);
    },

    _removeCalloutListeners: function (callout) {
        callout.removeEventListener("click", CliqzExtOnboarding._calloutClickListener);
        callout.removeEventListener("popuphidden", CliqzExtOnboarding._calloutCloseListener);
    },

    _addDropdownListeners: function (win) {
        win.CLIQZ.Core.popup.
            addEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },
    _removeDropdownListeners: function (win) {
        win.CLIQZ.Core.popup
            .removeEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },

    _addUrlbarKeydownListener: function (win) {
        win.CLIQZ.Core.urlbar.
            addEventListener("keydown", CliqzExtOnboarding._urlbarKeydownListener);
    },

    _removeUrlbarKeydownListener: function (win) {
        win.CLIQZ.Core.urlbar.
            removeEventListener("keydown", CliqzExtOnboarding._urlbarKeydownListener);
    },

    _calloutClickListener: function (e) {
        var target = e.target;
        if (target && (e.button == 0 || e.button == 1)) {
            var win = CliqzUtils.getWindow(),
                callout = CliqzExtOnboarding._getCallout(win),
                action = target.getAttribute("cliqz-action"),
                type = callout.getAttribute("msg_type");

            switch (action) {
                case "onboarding-start":
                    CliqzExtOnboarding._log("clicked on ok; remind user again in a bit");
                    CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "ok");
                    break;
                case "onboarding-cancel":
                    CliqzExtOnboarding._log("clicked on cancel; don't remind user again");
                    CliqzExtOnboarding._handleCalloutClosed(callout, "discarded", "discard");
                    break;
            }

            win.CLIQZ.Core.popup.hidePopup();
            if (type == "same_result") {
                win.CLIQZ.Core.openLink(destUrl, false);
            }
            callout.hidePopup();
        }
    },

    _calloutCloseListener: function () {
        var callout = CliqzExtOnboarding._getCallout(),
            type = callout.getAttribute("msg_type");

        if (CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "blur")) {
            if (type == "same_result") {
                CliqzUtils.getWindow().CLIQZ.Core.openLink(destUrl, false);
            }
        }
    },

    _dropdownCloseListener: function () {
        var callout = CliqzExtOnboarding._getCallout();

        // close callout whenever dropdown closes
        if (callout && callout.state == "open") {
            if (CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "result")) {
                callout.hidePopup();
            }
        }
    },

    _urlbarKeydownListener: function (e) {
        if (CliqzAutocomplete.selectAutocomplete) {
            if (currentAutocompleteUrlbar != CliqzAutocomplete.lastAutocompleteUrlbar) {
                // CliqzExtOnboarding._log("new autcompleted url, update");
                currentAutocompleteUrlbar =
                    CliqzAutocomplete.lastAutocompleteUrlbar;
                currentAutocompleteMinSelectionStart =
                    CliqzAutocomplete.lastAutocompleteSelectionStart;
            } else {
                // CliqzExtOnboarding._log("same autocompleted url, no update");
            }
        } else {
            var charsTyped =
                    currentAutocompleteUrlbar.length -
                    currentAutocompleteMinSelectionStart;
            currentAutocompleteUrlbar = "";
            currentAutocompleteMinSelectionStart = 0;
            if (e.keyCode == CliqzExtOnboarding.KEYCODE_ENTER) {
                if (CliqzHistoryPattern.generalizeUrl(CliqzUtils.getWindow().CLIQZ.Core.urlbar.value) !=
                    CliqzHistoryPattern.generalizeUrl(CliqzAutocomplete.lastAutocompleteUrlbar)) {
                    CliqzExtOnboarding._log("urlbar value has changed, no autocomplete");
                    return;
                }

                if (charsTyped > CliqzExtOnboarding.TYPED_URL_MIN_CHARS_TYPED) {
                    var _prefs = CliqzExtOnboarding._getPrefs("typed_url");
                    CliqzExtOnboarding._savePrefs("typed_url", _prefs);

                    if (CliqzExtOnboarding._shouldShowMessage("typed_url")) {
                        CliqzExtOnboarding._log("typed url: showing message");
                        CliqzExtOnboarding._telemetry("typed_url", "show", {
                            count: _prefs["show_count"],
                            chars_typed: charsTyped
                        });

                        var callout = CliqzExtOnboarding._getCallout();
                        CliqzExtOnboarding._setCalloutContent("typed_url");
                        callout.openPopup(CliqzUtils.getWindow().CLIQZ.Core.urlbar, "after_start", 20, -5);
                        callout.setAttribute("show_ts", Date.now());
                        callout.setAttribute("msg_type", "typed_url");
                    }
                } else {
                    CliqzExtOnboarding._log("_urlbarKeydownListener: not enough characters typed (" + charsTyped + ")");
                }
            }
        }
    },

    _handleCalloutClosed: function (callout, newState, reason) {
        // we already handled this close event
        var showTs = callout.getAttribute("show_ts");

        if (showTs == -1) {
            CliqzExtOnboarding._log("callout close event handled previously");
            return false;
        }

        var duration = Date.now() - callout.getAttribute("show_ts");
        // flag as "handled"
        callout.setAttribute("show_ts", -1);

        var type = callout.getAttribute("msg_type"),
            _prefs = CliqzExtOnboarding._getPrefs(type);

        _prefs["state"] = newState;
        _prefs["show_count"]++;
        _prefs["max_show_duration"] =
            Math.max(_prefs["max_show_duration"], duration);

        CliqzExtOnboarding._savePrefs(type, _prefs);

        CliqzExtOnboarding._telemetry(type, "close", {
            duration: duration,
            reason: reason
        });

        isSmartCliqzReady = false;
        return true;
    },

	_log: function (msg) {
		CliqzUtils.log(msg, "CliqzExtOnboarding");
	},

	_telemetry: function (component, action, data) {
        var signal = {
            type: 'extended_onboarding',
            // make configurable once there are more components
            component: component,
            action: action
        };

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                signal[key] = data[key];
            }
        }

        CliqzUtils.telemetry(signal);
    }
}
