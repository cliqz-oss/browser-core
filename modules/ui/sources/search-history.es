/*
 * This module remembers the last queries made in a tab and shows
 * them when appropiate
 *
 */

import utils from 'core/utils';
import config from "core/config";

/* Responsible for managing the 'Letzte Eingabe' button/dropdown. */
var CliqzSearchHistory = {
    windows: {},
    /* Inserts the 'Letzte Eingabe' button/dropdown before given element. */
    insertBeforeElement: function (window) {
        var window_id = utils.getWindowID(window);
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
                                                this.returnToLastSearch.bind(this.windows[window_id]));
        this.windows[window_id].searchHistoryContainer.appendChild(this.windows[window_id].lastSearchElement)

        return this.windows[window_id].searchHistoryContainer;
    },

    /* Puts the query in the dropdown and opens it. */
    returnToLastSearch: function (ev) {
        var urlBar = this.urlbar;

        urlBar.mInputField.focus();
        urlBar.mInputField.setUserInput(ev.target.query);

        utils.setTimeout(function(){
            if(urlBar.selectionStart == 0 && urlBar.selectionEnd == urlBar.value.length)
                urlBar.setSelectionRange(urlBar.value.length, urlBar.value.length);
        },0);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        utils.telemetry(action);
    },

    /* */
    lastQuery: function(window){
        var win = this.windows[utils.getWindowID(window)];
        var gBrowser = window.gBrowser;

        if(win && win.urlbar){
            var val = win.urlbar.value.trim(),
                lastQ = utils.autocomplete.lastSearch.trim();

            if (lastQ && val && !utils.isUrl(lastQ) && (val == lastQ || !this.isAutocomplete(val, lastQ)) && !val.startsWith("about:")) {
                this.showLastQuery(lastQ, window);
                win.lastQueryInTab[gBrowser.selectedTab.linkedPanel] = lastQ;
            } else {
                // remove last query if the user ended his search session
                if(utils.isUrl(lastQ))
                    delete win.lastQueryInTab[gBrowser.selectedTab.linkedPanel];
            }
        }
    },

    hideLastQuery: function(window){
        var win = this.windows[utils.getWindowID(window)];

        if(win && win.searchHistoryContainer)
            win.searchHistoryContainer.className = 'hidden';
    },

    showLastQuery: function(q, window){
        var window_id = utils.getWindowID(window),
            lq = this.windows[window_id].lastSearchElement;

        this.windows[window_id].searchHistoryContainer.className = 'cliqz-urlbar-Last-search-container';
        this.windows[window_id].searchHistoryContainer.setAttribute('channel', config.settings.channel);
        lq.textContent = q;
        lq.tooltipText = q;
        lq.query = q;
    },

    tabChanged: function(ev){
        var window = ev.target.ownerGlobal;
        var curWin = this.windows[utils.getWindowID(window)];

        // Clean last search to avoid conflicts
        utils.autocomplete.lastSearch = '';

        if(curWin && curWin.lastQueryInTab && curWin.lastQueryInTab[ev.target.linkedPanel])
            this.showLastQuery(curWin.lastQueryInTab[ev.target.linkedPanel], window);
        else
            this.hideLastQuery(window);
    },

    tabRemoved: function(ev){
        var window = ev.target.ownerGlobal;
        var window_id = utils.getWindowID(window);
        var document = window.document;
        var gBrowser = window.gBrowser;

        delete this.windows[window_id].lastQueryInTab[ev.target.linkedPanel];
    },

    isAutocomplete: function(base, candidate){
        if(base.indexOf('://') !== -1){
           base = base.split('://')[1];
        }
        base = base.replace('www.', '');

        return base.indexOf(candidate) == 0;
    },
};

export default CliqzSearchHistory;
