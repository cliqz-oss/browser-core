'use strict';
/*
 * Interactive onboarding for new UI.
 *
 * 
 * author: Dominik Schmidt (cliqz)
 */

var EXPORTED_SYMBOLS = ['CliqzTour'];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

// TODO: destroy?
var CliqzTour = {
    // 0.0: static web page
    // 1.0: interactive onboarding
    //      less aggressive (i.e., easier to cancel) than
    //      first version, which was distributed via cliqz.com
    //      but did not have a version number yet, just
    //      a binary flag (new vs. old onboarding)
    // 1.1: replaced start tour button on web page by callout
    VERSION: "1.1",

    // shortcuts
    urlBar: null,
    win: null,
    tab: null,
    browser: null, 
    contentDocument: null,
    visibleLabel: null,

    // settings
    charsPerSecond: 5,
    searchQuery: unescape("surfen m%FCnchen"),

    // callouts
    callout: null,
    // mouse cursor or lens
    cursor: null,
    
    // stored results to inject into dropdown
    results: { },
    // cache of frequently used elements on onboarding page
    pageElements: { },
    // to prevent multiple execution and to cancel
    isRunning: false,
    // counts how often user started the tour
    startCount: 0,

    // workaround to make popup hide when user clicks in URL bar
    isMouseOverUrlBar: false,

    // inital callout being shown
    isInitialPhase: true,

    // all the action
    storyboard: [
        { f: function () {            
            // wait a bit, otherwise URL bar won't be cleared
        }, t: 100 },
        // clear URL bar and hide mouse cursor
        { f: function () {            
            CliqzTour.clearUrlBar();
            CliqzTour.clearDropdown();
            // TODO: use CSS "disabled" class for this
            CliqzTour.getPageElement("tour-btn").style.cursor = "none";
        }, t: 100 },
        // blur out current page
        { f: function () {            
            CliqzTour.getPageElement('main-page').style.transition = 'filter .5s ease-in-out';
            CliqzTour.getPageElement('main-page').style.filter = 'blur(10px)'; 
        }, t: 400 },
        // position mouse cursor on button and show cancel button
        { f: function () {
            // var buttonBounds = CliqzTour.getPageElement("tour-btn").getBoundingClientRect();
            // var x = buttonBounds.x + buttonBounds.width / 2;
            // var y = buttonBounds.y + buttonBounds.height / 2;            
            var x = 500,
                y = 50;

            CliqzTour.setCursorAppearance("cursor");
            // TODO: replace magic offsets by values derived from element sizes
            CliqzTour.movePopupTo(CliqzTour.cursor, x - 32, y + 48);
            CliqzTour.showCursor();
            // TODO: disable button
            CliqzTour.showPageElement('tour-btn-cancel');
        }, t: 500 },        
        // move mouse cursor to URL bar        
        { f: function () {            
            CliqzTour.movePopupTo(CliqzTour.cursor, 30, 5, 1.5);
        }, t: 1500 },
        { f: function () {
            CliqzTour.performClick();
        }, t: 1000 }, 
        // show "type here" callout
        { f: function () {                        
            CliqzTour.setCalloutMessage(
                CliqzUtils.getLocalizedString("onCalloutTypeHere")); 
            CliqzTour.showCallout(45, -5, CliqzTour.urlBar, "after_start");
        }, t: 3000 },        
        // start typing and move lens
        { f: function () {            
            // FIXME: this closes dropdown
            // CliqzTour.focusUrlBar();
            CliqzTour.openDropdown();

            CliqzTour.typeMessage(CliqzTour.searchQuery);

            CliqzTour.hideCallout(); 

            CliqzTour.hideCursor();
            CliqzTour.setCursorAppearance("lens");            
            CliqzTour.movePopupTo(CliqzTour.cursor, 10, CliqzTour.getPopupUrlBarCenterOffsetY());
            CliqzTour.showCursor();

            CliqzTour.telemetry("step_query_started");
        }, t: 50 },     
        // move lens
        { f: function () {
            CliqzTour.movePopupBy(CliqzTour.cursor,
                CliqzTour.searchQuery.length * 6, 0, 
                CliqzTour.searchQuery.length / CliqzTour.charsPerSecond);
        }, t: 1300 },
        // show intermediate results in dropdown
        { f: function () {            
            CliqzTour.win.CLIQZ.UI.results(CliqzTour.results.intermediate);
        }, t: 1100 },
        // show final results in dropdown
        { f: function () {
            CliqzTour.win.CLIQZ.UI.results(CliqzTour.results.final);

            CliqzTour.telemetry("step_results_shown");
        }, t: 2100 },
        // show "these are cliqz results" callout
        { f: function () {
            CliqzTour.hideCursor();
            CliqzTour.setCalloutMessage(
                CliqzUtils.getLocalizedString("onCalloutCliqzResults")); 
            CliqzTour.showCallout(-5, 0, CliqzTour.win.CLIQZ.Core.popup, "end_before"); 
        }, t: 3500 },
        // show "click here" callout
        { f: function () {
            CliqzTour.hideCallout();
            CliqzTour.setCalloutMessage(
                CliqzUtils.getLocalizedString('onCalloutClickHere'));
            var anchor = CliqzTour.win.CLIQZ.Core.popup,
                position = "overlap",
                x = 210, y = -2;

            try {
                // TODO: find nice way of getting URL div
                anchor = CliqzTour.win.CLIQZ.Core.popup.cliqzBox.
                    firstElementChild.firstElementChild.
                    firstElementChild.firstElementChild.
                    firstElementChild.childNodes[3];
                position = "end_before";
                x = 40; y = -40;
            } catch (e) { }

            CliqzTour.showCallout(x, y, anchor, position);            
        }, t: 3500 }, 
        // reset mouse cursor position
        { f: function () {
            //CliqzTour.closePopup();
            CliqzTour.setCursorAppearance("cursor");
            CliqzTour.movePopupTo(CliqzTour.cursor, 30, 5);
            CliqzTour.showCursor();                               
        }, t: 250 },
        // move mouse cursor over first result
        { f: function () {
            CliqzTour.movePopupTo(CliqzTour.cursor, 190, 55, 1);
        }, t: 250 },
        // highlight first result
        { f: function () {            
            CliqzTour.win.CLIQZ.UI.simulateSelectFirstElement();    
        }, t: 1500 },
        // "click"
        { f: function () {
            CliqzTour.performClick();
        }, t: 750 },
        // simulate loading (i.e., show white page)
        { f: function () {                        
            CliqzTour.urlBar.value = 'http://riversurfen.tumblr.com/';
            CliqzTour.getPageElement("landing-page-background").style.opacity = 1;
            CliqzTour.getPageElement("landing-page-background").style.visibility = 'visible';            
            CliqzTour.hideCursor();
            CliqzTour.hideCallout();
        }, t: 0 },
        // close dropdown
        { f: function () {            
            CliqzTour.closeDropdown();
            CliqzTour.browser.focus();
        }, t: 750 },
        // show landing page
        { f: function () {
            CliqzTour.getPageElement("landing-page-content").style.visibility = 'visible';
            CliqzTour.telemetry("step_landing_page_shown");
        }, t: 750 },
        // show "you made it" callout (inside page, not as popup)
        { f: function () {
            CliqzTour.getPageElement('landing-page-content').style.transition = 'all 1s ease-in-out';
            CliqzTour.getPageElement('landing-page-content').style.filter = 'blur(10px)';
            CliqzTour.getPageElement('landing-page-callout').style.transition = 'none';
            CliqzTour.getPageElement('landing-page-callout').style.opacity = 0;
            CliqzTour.getPageElement('landing-page-callout').style.visibility = 'visible';

            CliqzUtils.setTimeout(function () {                
                CliqzTour.getPageElement('landing-page-callout').style.transition = 'opacity 1s ease-in-out';
                CliqzTour.getPageElement('landing-page-callout').style.opacity = 1;
            }, 25);

            // change main message (still hidden)
            CliqzTour.setTextContent(CliqzTour.getPageElement('message-installed'), 
                CliqzUtils.getLocalizedString('onMsgDemoDone'));
        }, t: 4000 },
        // fade out landing page
        { f: function () {
            CliqzTour.getPageElement('main-page').style.transition = 'none';
            CliqzTour.getPageElement('main-page').style.filter = 'none'; 
            CliqzTour.setTextContent(CliqzTour.getPageElement('tour-btn'), 
                CliqzUtils.getLocalizedString('onButtonTryOutAgain'));

            CliqzTour.getPageElement("landing-page-background").style.transition = 'opacity 1.5s ease-in-out';
            CliqzTour.getPageElement("landing-page-background").style.opacity = 0;

            CliqzTour.hidePageElement('tour-btn-cancel'); 

            CliqzTour.showPageElement('tour-btn');
            CliqzTour.getPageElement("tour-btn").style.cursor = "auto";

            CliqzTour.clearUrlBar();
        }, t: 1500 },
        // housekeeping
        { f: function () {
            CliqzTour.getPageElement("landing-page-content").style.visibility = 'hidden';
            CliqzTour.getPageElement('landing-page-content').style.transition = 'none';
            CliqzTour.getPageElement('landing-page-content').style.filter = 'none';
            CliqzTour.getPageElement("landing-page-background").style.visibility = 'hidden';   
            CliqzTour.getPageElement('landing-page-callout').style.visibility = 'hidden';                                                                             
        }, t: 1000 },
        // show "now you" callout
        { f: function () {
            CliqzTour.setCalloutMessage(
                CliqzUtils.getLocalizedString('onCalloutNowYou'));
            CliqzTour.showCallout(15, 5, CliqzTour.urlBar, "before_start");

            CliqzTour.urlBar.value = CliqzUtils.getLocalizedString('onUrlBarNowYou');

            CliqzTour.urlBar.setSelectionRange(0, CliqzTour.urlBar.mInputField.value.length);

            CliqzTour.clearDropdown();
                        
            // clear URL bar on click and hide callout
            CliqzTour.urlBar.addEventListener('click', CliqzTour.clearUrlBarListener); 
            CliqzTour.callout.addEventListener('click', CliqzTour.clearUrlBarListener);

            var keypressListener = function () {
                CliqzTour.urlBar.removeEventListener('keypress', keypressListener);
                CliqzTour.hideCallout();
            };
            CliqzTour.urlBar.addEventListener('keypress', keypressListener);
        }, t: 0 },
        // open dropdown and clean up
        { f: function () {
            // CliqzTour.openDropdown();    
            CliqzTour.focusUrlBar();

            CliqzTour.isRunning = false;
            CliqzTour.telemetry("finished");
            CliqzUtils.setPref('onboarding_finishedWatching', true);
        }, t: 0 }
    ],

    /* **** control methods **** */
    // called when onboarding HTML page is loaded
    init: function() {
        CliqzTour.log('init');

        CliqzTour.win = Components.classes['@mozilla.org/appshell/window-mediator;1']
                        .getService(Components.interfaces.nsIWindowMediator)
                         .getMostRecentWindow("navigator:browser");
        CliqzTour.urlBar = CliqzTour.win.CLIQZ.Core.urlbar;
        CliqzTour.tab = CliqzTour.win.gBrowser.selectedTab;
        CliqzTour.browser = CliqzTour.win.gBrowser.selectedBrowser;
        CliqzTour.contentDocument = CliqzTour.browser.contentDocument;
        CliqzTour.visibleLabel = CliqzTour.tab.visibleLabel;

        CliqzUtils.httpGet('chrome://cliqz/content/onboarding/results/final_results.json',
            function success(req) { CliqzTour.results.final = JSON.parse(req.response); });

        CliqzUtils.httpGet('chrome://cliqz/content/onboarding/results/intermediate_results.json',
            function success(req) { CliqzTour.results.intermediate = JSON.parse(req.response); });

        if (!CliqzTour.callout) {
            CliqzTour.callout = CliqzTour.createPopup("callout");
            CliqzTour.cursor = CliqzTour.createPopup("cursor");            
        }

        CliqzTour.startCount = 0;
        
        CliqzTour.callout.addEventListener(
                "popuphidden", CliqzTour.popupHiddenListener);
        CliqzTour.callout.addEventListener(
                "popuphiding", CliqzTour.popupHidingListener);
        CliqzTour.callout.addEventListener(
                "click", CliqzTour.popupClickListener);
        CliqzTour.cursor.addEventListener(
                "popuphidden", CliqzTour.popupHiddenListener);

        CliqzTour.win.addEventListener(
                "click", CliqzTour.clickListener);
        CliqzTour.win.addEventListener(
                "keyup", CliqzTour.keyupListener);
        CliqzTour.win.addEventListener(
                "blur", CliqzTour.windowBlurListener, true);
        CliqzTour.win.gBrowser.tabContainer.addEventListener(
                "TabSelect", CliqzTour.tabSwitchListener);
        CliqzTour.win.gBrowser.tabContainer.addEventListener(
                "TabClose", CliqzTour.tabCloseListener);

        CliqzTour.urlBar.addEventListener("mouseenter",
            CliqzTour.urlBarMouseEnterListener);
        CliqzTour.urlBar.addEventListener("mouseleave",
            CliqzTour.urlBarMouseLeaveListener);

        CliqzTour.isRunning = false;
        CliqzTour.pageElements = { };

        CliqzTour.setTemplateContent(
            CliqzTour.callout.firstChild,
            'onboarding-callout',
            { 
                message: CliqzUtils.getLocalizedString("onCalloutIntro"),
                options: [
                    { label: CliqzUtils.getLocalizedString("onCalloutIntroBtnStart"), action: 'onboarding-start', state: 'ok' },
                    { label: CliqzUtils.getLocalizedString("onCalloutIntroBtnCancel"), action: 'onboarding-cancel', state: 'cancel' },
                ]
            } );
        CliqzTour.callout.setAttribute("preventHiding", true);
        CliqzTour.showCallout(15, 5, CliqzTour.urlBar, "after_start");
        CliqzTour.isInitialPhase = true;

        CliqzTour.clearUrlBar();

        CliqzTour.telemetry("shown", { version: CliqzTour.VERSION });
    }, 
    start: function(source) {
        if (!CliqzTour.isRunning) {                   
            var scheduler = {
                queue: [ ],
                speedup: 1,
                run: function () {
                    let next = this.queue.shift();
                    let self = this;

                    if (next) {
                        // CliqzTour.log('preparing storyboard item');
                        // run now
                        CliqzUtils.setTimeout(function() {
                            // if not canceled
                            if (CliqzTour.isRunning) {
                                // CliqzTour.log('running storyboard item');
                                try {
                                    next.f();
                                    // wait
                                    // CliqzTour.log('scheduling next storyboard item');                                    
                                } catch (e) {
                                    CliqzTour.log('error running storyboard item: ' + e);                                    
                                }
                                CliqzUtils.setTimeout(function() {                        
                                    self.run(); 
                                }, next.t / self.speedup);
                            }
                        }, 0);
                    }
                },
                push: function(f, t) {
                    this.queue.push({ f: f, t: t });
                }
            };                
            
            scheduler.queue = CliqzTour.storyboard.slice(0);
            // for debugging... to not have to wait that long :)
            scheduler.speedup = 1;

            CliqzTour.isRunning = true;
            scheduler.run();            
            
            CliqzTour.telemetry("started", {
                "source": source,
                "start_count": CliqzTour.startCount
            });

            CliqzTour.startCount++;
        } else {
            CliqzTour.log('tour is already running');
        }
    },
    unload: function () {
        CliqzTour.win.removeEventListener(
                "click", CliqzTour.clickListener);
        CliqzTour.win.removeEventListener(
                "keyup", CliqzTour.keyupListener);
        CliqzTour.win.removeEventListener(
                "blur", CliqzTour.windowBlurListener);
        CliqzTour.callout.removeEventListener(
                "click", CliqzTour.popupClickListener);
        CliqzTour.callout.removeEventListener(
                "popuphidden", CliqzTour.popupHiddenListener);
        CliqzTour.callout.removeEventListener(
                "popuphiding", CliqzTour.popupHidingListener);
        CliqzTour.cursor.removeEventListener(
                "popuphidden", CliqzTour.popupHiddenListener);

        CliqzTour.urlBar.removeEventListener("mouseenter",
            CliqzTour.urlBarMouseEnterListener);
        CliqzTour.urlBar.removeEventListener("mouseleave",
            CliqzTour.urlBarMouseLeaveListener);

        CliqzTour.win.gBrowser.tabContainer.removeEventListener(
                "TabSelect", CliqzTour.tabSwitchListener);
        // remove later so the tab close event can be consumed
        CliqzUtils.setTimeout(function () {
            CliqzTour.win.gBrowser.tabContainer.removeEventListener(
                    "TabClose", CliqzTour.tabCloseListener);
        }, 1000);

        CliqzTour.stop();
        CliqzTour.reset();
        CliqzTour.telemetry("unloaded");
    },
    stop: function () {
        if (CliqzTour.isRunning) {
            CliqzTour.isRunning = false;
        }
    },
    reset: function () {
        CliqzTour.getPageElement('main-page').style.transition = 'none';
        CliqzTour.getPageElement('main-page').style.filter = 'none'; 

        CliqzTour.getPageElement("landing-page-content").style.visibility = 'hidden';
        CliqzTour.getPageElement('landing-page-content').style.transition = 'none';
        CliqzTour.getPageElement('landing-page-content').style.filter = 'none';
        CliqzTour.getPageElement("landing-page-background").style.visibility = 'hidden';
        CliqzTour.getPageElement('landing-page-callout').style.visibility = 'hidden';

        CliqzTour.showPageElement('tour-btn');
        CliqzTour.getPageElement("tour-btn").style.cursor = "pointer";

        CliqzTour.getPageElement('tour-btn-cancel').style.visibility = 'hidden';

        CliqzUtils.setTimeout(function () {
            CliqzTour.closeDropdown();
            CliqzTour.hideCallout();
            CliqzTour.hideCursor();
            CliqzTour.clearDropdown();
            CliqzTour.clearUrlBar();
        }, 0);        
    },
    cancel: function (source) {   
        CliqzTour.telemetry("canceled", {
            "source": source
        });
        CliqzTour.stop();
        CliqzTour.reset();
    },

    /* **** dropdown helpers **** */
    clearDropdown: function () {
        if (CliqzTour.win.CLIQZ.Core.popup.cliqzBox.children.length > 0) {
            var content = CliqzTour.win.CLIQZ.Core.popup.cliqzBox.children[0].children[0];

            while (content.firstChild) {
                content.removeChild(content.firstChild);
            }
        }
    },
    openDropdown: function () {
        CliqzTour.win.CLIQZ.Core.popup.
            _openAutocompletePopup(CliqzTour.urlBar, CliqzTour.urlBar);
    },
    closeDropdown: function () {
        CliqzTour.win.CLIQZ.Core.popup.hidePopup();
    },
    clearUrlBar: function () {
        CliqzTour.urlBar.value = "";
    },
    clickListener: function (e) {
        // make sure the click was not on the start button
        if (CliqzTour.isRunning && e.target &&
            e.target.id != "tour-btn" &&
            !e.target.getAttribute('cliqz-action')) {

            CliqzTour.cancel("callout");            
        }        
    },
    keyupListener: function (e) {
        switch (e.key) { 
            case "Escape":
            case "Tab":
                if (CliqzTour.isInitialPhase) {
                    CliqzTour.callout.setAttribute("preventHiding", false);
                    CliqzTour.hideCallout();
                    CliqzTour.showPageElement('tour-btn');
                    CliqzTour.isInitialPhase = false;
                }
                break;
        }
    },
    windowBlurListener: function (e) {
        if (CliqzTour.isInitialPhase) {
            CliqzTour.callout.setAttribute("preventHiding", false);
            CliqzTour.hideCallout();
            CliqzTour.showPageElement('tour-btn');
            CliqzTour.isInitialPhase = false;
        }
    },
    popupHiddenListener: function (e) {
        // stop tour only if hiding was triggered by user, but
        // not if triggered programmatically via hidePopup()
        if (CliqzTour.isRunning && 
            e.target.getAttribute("isHiding") != "true") {
            CliqzTour.telemetry("canceled", { "source": "interrupt" });
            CliqzTour.stop();
            CliqzTour.reset();
        }
        e.target.setAttribute("isHiding", false);
    },
    popupHidingListener: function (e) {
        if (CliqzTour.isInitialPhase && e.target.getAttribute("preventHiding") == "true") {
            if (CliqzTour.isMouseOverUrlBar) {
                CliqzTour.clearUrlBar();
                CliqzTour.focusUrlBar();    
                CliqzTour.isInitialPhase = false;            
            } else {
                e.preventDefault();
            }
        }
    },
    popupClickListener: function (e) {
        var target = e.target;
        if (target && (e.button == 0 || e.button == 1)) {
            var action = target.getAttribute('cliqz-action');
            switch (action) {
                case 'onboarding-start':
                    CliqzTour.callout.setAttribute("preventHiding", false);
                    CliqzTour.hideCallout();
                    CliqzTour.start("callout");
                    CliqzTour.isInitialPhase = false;
                    break;
                case 'onboarding-cancel':
                    CliqzTour.log('popupClickListener');
                    CliqzTour.callout.setAttribute("preventHiding", false);
                    CliqzTour.hideCallout(); 
                    CliqzTour.showPageElement('tour-btn');
                    CliqzTour.isInitialPhase = false;
                    CliqzTour.focusUrlBar();
                    break;
            }
        }
    },
    urlBarMouseEnterListener: function (e) { 
        CliqzTour.isMouseOverUrlBar = true;
    },
    urlBarMouseLeaveListener:  function (e) {             
        CliqzTour.isMouseOverUrlBar = false;
    },
    clearUrlBarListener: function () {
        CliqzTour.clearUrlBar();
        CliqzTour.urlBar.removeEventListener('click', CliqzTour.clearUrlBarListener);

        CliqzTour.hideCallout();
        CliqzTour.callout.removeEventListener('click', CliqzTour.clearUrlBarListener);        
    },
    tabSwitchListener: function () {
        // TODO: detect if a tab switch was away from our tab
        if (CliqzTour.isRunning) {
            CliqzTour.telemetry('tab_switched');
            CliqzTour.stop();
            CliqzTour.reset();
        }  
    },
    tabCloseListener: function (e) {
        if (e.target.visibleLabel == CliqzTour.visibleLabel) {         
            CliqzTour.telemetry("tab_closed");    
        }
    },
    focusUrlBar: function () {
        CliqzTour.win.CLIQZ.Core.urlbar.focus();
    },

    /** **** DOM helpers **** **/
    getPageElement: function (id) {
        if (!CliqzTour.pageElements.hasOwnProperty(id)) {
            CliqzTour.pageElements[id] = 
                CliqzTour.contentDocument.getElementById(id);
        }
        return CliqzTour.pageElements[id];
    },
    // TODO: replace by jQuery fadeIn()?
    showPageElement: function (id) {
        var element = CliqzTour.getPageElement(id);
        var duration = .5;

        CliqzUtils.setTimeout(function () {
            element.style.transition = 'none';
            element.style.opacity = 0;
            element.style.visibility = 'visible';
        }, 0);

        CliqzUtils.setTimeout(function () {
            element.style.transition = 'opacity ' + duration + 's ease-in-out';
            element.style.opacity = 1;
        }, 25);
    },
    hidePageElement: function (id) {
        var element = CliqzTour.getPageElement(id);
        var duration = .5;

        CliqzUtils.setTimeout(function () {
            element.style.transition = 'opacity ' + duration + 's ease-in-out';
            element.style.opacity = 0;            
        }, 0);

        CliqzUtils.setTimeout(function () {
            element.style.transition = 'none';
            element.style.visibility = 'hidden';
        }, duration * 1000);
    },
    typeMessage: function (text, pos) {
        if (!pos) {
            pos = 0;
        }

        if (pos < text.length && CliqzTour.isRunning) {
            CliqzUtils.setTimeout(function() {
                CliqzTour.urlBar.value = text.substr(0, ++pos);
                CliqzTour.typeMessage(text, pos);
            }, (1000.0 / CliqzTour.charsPerSecond) + Math.random(250)); 
        }
    },
    setTextContent: function (node, text) {
        node.textContent = text;
    },
    setTemplateContent: function (node, templateName, data) {
        node.innerHTML = CliqzHandlebars.tplCache[templateName](data);
    },

    /* **** general helpers **** */
    log: function (msg) {
        CliqzUtils.log(msg, 'CliqzTour');
    },
    telemetry: function (action, data) {
        var signal = {
            type: 'onboarding',
            action: action
        };

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                signal[key] = data[key];
            }
        }

        CliqzUtils.telemetry(signal);
    },

    /* **** popup helpers **** */
    // call only once
    createPopup: function (type) {
        var container = CliqzTour.win.document.createElement('panel'),
            content = CliqzTour.win.document.createElement('div'),            
            anchor = CliqzTour.win.CLIQZ.Core.popup.parentElement;    

        // TODO: use IDs instead of classes
        container.className = 'onboarding-container';
        
        switch (type) {
            case "callout":
                content.className = "onboarding-callout";
                container.setAttribute("type", "arrow");
                break;
            case "cursor":
                content.className = "onboarding-cursor";
            default:

        }

        container.style.marginLeft ='0px';
        container.style.marginTop = '0px';
        // FIXME: this popup shows on top of all windows even if FF is not in front anymore
        container.setAttribute("level", "top");
        container.setAttribute("position", "topleft topleft");
                
        container.appendChild(content);    
        anchor.appendChild(container);
        
        return container;
    },
    showCursor: function () {
        CliqzTour.showPopup(CliqzTour.cursor, CliqzTour.urlBar);
    },
    showCallout: function (x, y, anchor, position) {
        //CliqzTour.movePopupTo(CliqzTour.callout, x, y);
        CliqzTour.showPopup(CliqzTour.callout, anchor, x, y, position);
    },
    showPopup: function (popup, anchor, x, y, position) {
        x = x || 0;
        y = y || 0;
        anchor = anchor || CliqzTour.urlBar;
        position = position || "topleft topleft";

        CliqzUtils.setTimeout(function () {
            popup.style.transition = 'none';
            popup.style.opacity = 0;
            popup.openPopup(anchor, position, x, y);
        }, 0);

        CliqzUtils.setTimeout(function () {
            popup.style.transition = 'opacity .25s ease-in-out';
            popup.style.opacity = 1;
        }, 25);
    },
    hideCursor: function () {
        CliqzTour.hidePopup(CliqzTour.cursor);
    },
    hideCallout: function () {
        CliqzTour.hidePopup(CliqzTour.callout);
    },
    hidePopup: function (popup) {   
        // set flag to distinguish popup hiding because of
        // user interaction vs. programatic closing in storyboard     
        if (CliqzTour.isRunning) {
            popup.setAttribute("isHiding", true);
        }

        popup.hidePopup();
        // TODO: fade out
    },
    movePopupTo: function (popup, x, y, t) {  
        if (t) {      
            popup.style.transition = 'all ' + t + 's ease-in-out';
        } else {
            popup.style.transition = 'none';
        }

        popup.style.marginLeft = x + 'px';
        popup.style.marginTop = y + 'px';
    },
    movePopupBy: function (popup, x, y, t) {
        x += parseInt(popup.style.marginLeft);
        y += parseInt(popup.style.marginTop);

        return CliqzTour.movePopupTo(popup, x, y, t);
    },
    setCursorAppearance: function (appearance) {
        switch (appearance) {
            case "lens":
                CliqzTour.cursor.firstChild.className = "onboarding-lens";
                break;
            case "cursor":
                CliqzTour.cursor.firstChild.className = "onboarding-cursor";
                break;            
            default:
                CliqzTour.cursor.firstChild.className = "onboarding-lens";
        }
    },
    setCalloutMessage: function (message) {        
        CliqzTour.setTextContent(CliqzTour.callout.firstChild, message);
    },
    getPopupUrlBarCenterOffsetY: function () {
        // TODO: calculate
        return -13;
        // return (CliqzTour.urlBar.clientHeight - 
        //         CliqzTour.callout.clientHeight) / 2;
    },
    getPopupUrlBarOnTopOffsetY: function () {
        // TODO: calculate
        return -40;
        // return -CliqzTour.callout.clientHeight;
    },
    performClick: function () {
        CliqzTour.cursor.firstChild.style.transition = 'background-size .25s ease-in-out';
        CliqzTour.cursor.firstChild.style.backgroundSize = "12px"; 

        CliqzUtils.setTimeout(function () {
            CliqzTour.cursor.firstChild.style.backgroundSize = "20px"; 
        }, 250);
    }

};
