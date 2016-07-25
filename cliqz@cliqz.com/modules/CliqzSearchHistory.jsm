'use strict';
/*
 * This module remembers the last queries made in a tab and shows
 * them when appropiate
 *
 */

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var EXPORTED_SYMBOLS = ['CliqzSearchHistory'];


/* Responsible for managing the 'Letzte Eingabe' button/dropdown. */
var CliqzSearchHistory = {
    windows: {},
    /* Inserts the 'Letzte Eingabe' button/dropdown before given element. */
    insertBeforeElement: function (element, window) {
        window = window || CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;
        this.windows[window_id] = {};

        var targetPosition = window.CLIQZ.Core.urlbar.mInputField.parentElement;

        // Set urlbar for current window
        this.windows[window_id].urlbar = document.getElementById('urlbar');
        // Initialize per-tab history for window
        this.windows[window_id].lastQueryInTab = {};
        // Create container element
        this.windows[window_id].searchHistoryContainer = document.createElement('hbox');
        this.windows[window_id].searchHistoryContainer.className = 'hidden'; // Initially hide the container
        targetPosition.insertBefore(this.windows[window_id].searchHistoryContainer, targetPosition.firstChild);

        // Add last search button to container
        this.windows[window_id].lastSearchElement = document.createElement('hbox');
        this.windows[window_id].lastSearchElement.className = 'cliqz-urlbar-Last-search';
        this.windows[window_id].lastSearchElement.addEventListener('click',
                                                this.returnToLastSearch.bind(this));
        this.windows[window_id].searchHistoryContainer.appendChild(this.windows[window_id].lastSearchElement)

        return this.windows[window_id].searchHistoryContainer;
    },

    /* Puts the query in the dropdown and opens it. */
    returnToLastSearch: function (ev) {
        var urlBar = this.windows[CliqzUtils.getWindowID()].urlbar;

        urlBar.mInputField.focus();
        urlBar.mInputField.setUserInput(ev.target.query);

        CliqzUtils.setTimeout(function(){
            if(urlBar.selectionStart == 0 && urlBar.selectionEnd == urlBar.value.length)
                urlBar.setSelectionRange(urlBar.value.length, urlBar.value.length);
        },0);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        CliqzUtils.telemetry(action);
    },

    /* */
    lastQuery: function(){
        var gBrowser = CliqzUtils.getWindow().gBrowser,
            win = this.windows[CliqzUtils.getWindowID()];
        if(win && win.urlbar){
            var val = win.urlbar.value.trim(),
                lastQ = CliqzAutocomplete.lastSearch === 'IGNORE_TOPSITES' ?
                        '' : CliqzAutocomplete.lastSearch.trim();

            if(lastQ && val && !CliqzUtils.isUrl(lastQ) && (val == lastQ || !this.isAutocomplete(val, lastQ) )){
                this.showLastQuery(lastQ);
                win.lastQueryInTab[gBrowser.selectedTab.linkedPanel] = lastQ;
            } else {
                // remove last query if the user ended his search session
                if(CliqzUtils.isUrl(lastQ))
                    delete win.lastQueryInTab[gBrowser.selectedTab.linkedPanel];
            }
        }
    },

    hideLastQuery: function(){
        var win = this.windows[CliqzUtils.getWindowID()];

        if(win && win.searchHistoryContainer)
            win.searchHistoryContainer.className = 'hidden';
    },

    showLastQuery: function(q){
        var window_id = CliqzUtils.getWindowID(),
            lq = this.windows[window_id].lastSearchElement;

        this.windows[window_id].searchHistoryContainer.className = 'cliqz-urlbar-Last-search-container';
        lq.textContent = q;
        lq.tooltipText = q;
        lq.query = q;
    },

    tabChanged: function(ev){
        var curWin = this.windows[CliqzUtils.getWindowID()];

        // Clean last search to avoid conflicts
        CliqzAutocomplete.lastSearch = '';

        if(curWin.lastQueryInTab && curWin.lastQueryInTab[ev.target.linkedPanel])
            this.showLastQuery(curWin.lastQueryInTab[ev.target.linkedPanel]);
        else
            this.hideLastQuery();
    },

    tabRemoved: function(ev){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        delete this.windows[window_id].lastQueryInTab[ev.target.linkedPanel];
    },

    isAutocomplete: function(base, candidate){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        if(base.indexOf('://') !== -1){
           base = base.split('://')[1];
        }
        base = base.replace('www.', '');

        return base.indexOf(candidate) == 0;
    },
};
