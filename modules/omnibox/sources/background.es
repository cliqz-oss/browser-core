import inject from '../core/kord/inject';
import background from '../core/base/background';
import omniboxapi from '../platform/omnibox/omnibox';
import { getMessage } from '../core/i18n';
import OffersReporter from '../dropdown/telemetry/offers';
import prefs from '../core/prefs';
import BrowserDropdownManager from '../core/dropdown/browser';
import contextmenuapi from '../platform/context-menu';

export default background({
  UPDATE_DATA_EVENTS: ['onInput', 'onKeydown', 'onFocus', 'onBlur', 'onDrop', 'onDropmarker'],

  core: inject.module('core'),
  search: inject.module('search'),
  history: inject.module('history'),
  offers: inject.module('offers-v2'),

  events: {
    'ui:click-on-url': async function onClick({ rawResult }) {
      if (!this.inOffersAB) {
        return;
      }

      if (
        this.currentResults && this.currentResults[0] &&
        (rawResult.text === this.currentResults[0].text)
      ) {
        await this.offersReporter.reportShows(this.currentResults);
      }

      this.offersReporter.reportClick(this.currentResults, rawResult);
    },

    'search:session-end': function onBlur() {
      if (
        !this.inOffersAB ||
        !this.currentResults
      ) {
        return;
      }

      this.offersReporter.reportShows(this.currentResults);
    },

    'search:results': function onResults(results) {
      this._dropdownManager.render({
        query: results.query,
        rawResults: results.results,
      });

      if (!this.inOffersAB) {
        return;
      }

      this.currentResults = results;
      this.offersReporter.registerResults(results);
    },
  },

  get inOffersAB() {
    return prefs.get('offers2UserEnabled', true);
  },

  _updateData(details) {
    this._dropdownManager.updateURLBarCache(details);
  },

  async _onContextMenuShown(info) {
    if (!info.contexts.includes('link')) {
      return;
    }
    const { lastResult } = this._dropdownManager;
    if (lastResult && lastResult.isDeletable) {
      await contextmenuapi.create({
        id: 'remove-from-history',
        title: 'Remove from History',
        icons: null,
        contexts: ['link']
      });
      this._lastResult = lastResult;
    } else {
      contextmenuapi.removeAll();
    }
    contextmenuapi.refresh();
  },

  _onContextMenuItemClicked() {
    this._dropdownManager.removeFromHistoryAndBookmarks(this._lastResult.historyUrl);
  },

  async init(settings) {
    await omniboxapi.override('modules/dropdown/dropdown.html');
    this._settings = settings;
    this._dropdownManager = new BrowserDropdownManager({
      cliqz: {
        core: this.core,
        search: this.search,
      },
    });
    this._dropdownManager.createIframeWrapper();
    this.updateData = this._updateData.bind(this);
    this.onContextMenuShown = this._onContextMenuShown.bind(this);
    this.onContextMenuItemClicked = this._onContextMenuItemClicked.bind(this);

    omniboxapi.setPlaceholder(getMessage('freshtab_urlbar_placeholder'));

    this.UPDATE_DATA_EVENTS
      .forEach(eventName => omniboxapi[eventName].addListener(this.updateData));

    this._handlers = ['onInput', 'onKeydown', 'onBlur', 'onDropmarker'].reduce((h, eventName) => {
      h.set(eventName, this._dropdownManager[eventName].bind(this._dropdownManager));
      omniboxapi[eventName].addListener(h.get(eventName));
      return h;
    }, new Map());

    this.offersReporter = new OffersReporter(this.offers);
    contextmenuapi.onShown.addListener(this.onContextMenuShown);
    contextmenuapi.onClicked.addListener(this.onContextMenuItemClicked);
  },

  unload() {
    omniboxapi.restore();

    for (const [eventName, handler] of this._handlers) {
      omniboxapi[eventName].removeListener(handler);
    }

    this.UPDATE_DATA_EVENTS
      .forEach(eventName => omniboxapi[eventName].removeListener(this.updateData));
  }
});
