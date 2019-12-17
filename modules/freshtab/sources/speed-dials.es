import prefs from '../core/prefs';
import events from '../core/events';
import hash from '../core/helpers/hash';
import History from '../platform/freshtab/history';
import EventManager from '../core/event-manager';
import SpeedDial from './speed-dial';
import config from './config';
import {
  tryDecodeURI,
  tryDecodeURIComponent,
  getUrlVariations,
  fixURL,
} from '../core/url';

const DIALS_PREF = 'extensions.cliqzLocal.freshtab.speedDials';
const MAX_DIALS = config.constants.MAX_SPOTS * config.constants.MAX_PAGES;
const PROTOCOL_AND_TRAILING_SLASH = {
  protocol: true,
  www: false,
};

function getUrlVariationsSet(url) {
  const decodedURL = tryDecodeURI(url);
  const urlVariations = getUrlVariations(decodedURL, PROTOCOL_AND_TRAILING_SLASH);
  return new Set(urlVariations);
}

function excludeDialWithURL(dials, url, { custom = false } = {}) {
  const excludeURLs = getUrlVariationsSet(url);
  return dials.filter((d) => {
    const u = custom ? d.url : d;
    return !excludeURLs.has(u)
      && !excludeURLs.has(tryDecodeURI(u));
  });
}

function findDialIndexWithURL(dials, url) {
  const excludeURLs = getUrlVariationsSet(url);
  return dials.findIndex(d =>
    excludeURLs.has(d.url) || excludeURLs.has(tryDecodeURI(d.url)));
}

/**
 * Manages retrieving, editing and storing speed dials on the fresh tab.
 */
class SpeedDials {
  constructor() {
    this._onChangeEventManager = new EventManager((callback) => {
      const listener = (prefKey, ...args) => {
        if (prefKey === DIALS_PREF) {
          callback(...args);
        }
      };
      events.sub('prefchange', listener);
      return () => events.un_sub('prefchange', listener);
    });
    this.onChanged = this._onChangeEventManager.api();
  }

  unload() {
    this._onChangeEventManager.destroy();
  }

  /**
   * Retrieve "most visited" and "custom" speed dials as instances of `SpeedDial` object.
   *
   * * "Custom" speed dials are the ones that manually added by user and stored in prefs.
   * * "Most visited" speed dials contain `MAX_DIALS` of most frequently visited pages, excluding:
   *   - sites that already added as custom speed dials;
   *   - pages in "most visited" whose address differs only by protocol or trailing slash;
   *   - sites that were previously hidden from this list;
   *   - adult sites (this filter works only in Cliqz browser).
   * @returns {object} speed dials
   */
  async get() {
    const { history: hashesToHide, custom } = this._dials;
    const customDials = custom.map((dial) => {
      const customDial = new SpeedDial({
        ...dial,
        isCustom: true,
      });
      return customDial;
    });

    const topUrls = await History.getTopUrls({
      limit: MAX_DIALS,
      exclude: this._getTopURLsToExclude(),
      includeAdult: false,
    });

    const historyDials = topUrls
      .reduce((acc, history) => {
        if (!hashesToHide[hash(history.url)]) {
          acc.push(new SpeedDial({
            url: history.url,
            title: history.title,
            isCustom: false
          }));
        }
        return acc;
      }, []);

    return {
      history: historyDials,
      custom: customDials,
    };
  }

  /**
   * Add a new speed dial to the "custom" section.
   * Note that:
   * - Adding a dial with address that cannot be transormed into valid URL will return "invalid"
   *   error object.
   * - Adding a dial with an address similar to another existing "custom" speed dial will return
   *   "invalid" error object.
   * - Adding a dial with an address that is already present in "most visited" section
   *   will NOT result in a "duplicate" error.
   *
   * @param {object} dial
   * @param {string} dial.url
   * @param {string} dial.title
   * @param index index at which new speed dial will be inserted
   * @returns {object} a newly created speed dial or an error object
   */
  addCustom({ url, title = '' }, index) {
    const fixedURL = fixURL(url);
    const { custom } = this._dials;
    if (fixedURL === null) {
      return this._getErrorObject('invalid');
    }
    const isDuplicate = findDialIndexWithURL(custom, fixedURL) !== -1;
    if (isDuplicate) {
      return this._getErrorObject('duplicate');
    }

    const newDial = {
      url: fixedURL,
      title,
    };

    if (typeof index === 'number') {
      custom.splice(index, 0, newDial);
    } else {
      custom.push(newDial);
    }

    this._save({
      ...this._dials,
      custom,
    });

    return new SpeedDial({
      ...newDial,
      isCustom: true,
    });
  }

  /**
   * Changes properties of an existing "custom" speed dial.
   * @param {string} urlToEdit
   * @param {object} newDial
   * @param {string} newDial.url
   * @param {string} newDial.title
   * @returns {object}  an edited speed dial or an error object
   */
  editCustom(urlToEdit, { url, title = '' }) {
    const { custom } = this._dials;
    const index = findDialIndexWithURL(custom, urlToEdit);
    if (index === -1) {
      return this._getErrorObject('not-found');
    }
    const oldDial = custom[index];
    this.remove({ custom: true, url: urlToEdit });
    const result = this.addCustom({ url, title }, index);
    if (result.error) {
      this.addCustom(oldDial, index);
    }
    return result;
  }

  /**
   * Remove an existing "custom" speed dial with given url or prevent given url
   * from appearing in "most visited section"
   * @param {object} dial
   * @param {string} dial.url
   * @param {boolean} dial.custom
   */
  remove({ custom, url }) {
    const dials = this._dials;
    const newDials = { ...dials };
    if (custom) {
      newDials.custom = excludeDialWithURL(dials.custom, url, { custom: true });
    } else {
      newDials.hidden = dials.hidden.concat([url]);
    }
    this._save(newDials);
  }

  /**
   * Allow a given url previously marked as "hidden" to appear in "most visited" again.
   * @param {string} url
   */
  restore(url) {
    const dials = this._dials;
    delete dials.history[hash(url)];
    this._save({
      ...dials,
      hidden: excludeDialWithURL(dials.hidden, url),
    });
  }

  /**
   * Allow all urls previously marked as "hidden" to appear in "most visited" again.
   */
  restoreAll() {
    this._save({
      ...this._dials,
      hidden: [],
      history: {},
    });
  }

  /**
   * `true` if there are any marked as "hidden".
   */
  get hasHidden() {
    const { history, hidden } = this._dials;
    return hidden.length > 0 || Object.keys(history).length > 0;
  }

  /**
   * `true` if there is at least one "custom" speed dial,
   */
  get hasCustom() {
    return this._dials.custom.length > 0;
  }

  /**
   * Retrieves `SpeedDials` state from prefs
   * @private
   */
  get _dials() {
    const dials = prefs.getObject(DIALS_PREF);
    return {
      hidden: [],
      history: {},
      ...dials,
      // In earlier versions speed dial URLs could be stored encoded.
      // Try to decode them for compatibility.
      custom: (dials.custom && dials.custom.map((d) => {
        // eslint-disable-next-line
        d.url = tryDecodeURI(tryDecodeURIComponent(d.url));
        return d;
      })) || [],
    };
  }

  /**
   * Stores `SpeedDials` state in prefs
   * @private
   */
  _save(dials) {
    prefs.setObject(DIALS_PREF, {
      custom: [],
      hidden: [],
      history: {},
      ...dials,
    });
  }

  /**
   * @returns {array<string>} a list of URLs that should not be included in the list
   * of "most vsited" URLs. It contains all URLs from "custom" speed dials, all URLs
   * that were marked as "hidden" and all urls that look similar to the previous ones
   * (i.e. differ only by protocol or trailing slash)
   * @private
   */
  _getTopURLsToExclude() {
    const { hidden, custom } = this._dials;
    const urls = hidden.concat(custom.map(d => tryDecodeURIComponent(d.url)));
    return Array.from(
      urls.reduce((e, url) => {
        getUrlVariations(url, PROTOCOL_AND_TRAILING_SLASH).forEach(u => e.add(u));
        return e;
      }, new Set())
    );
  }

  _getErrorObject(reason) {
    return {
      error: true,
      reason: typeof reason === 'object' ? reason.toString() : reason
    };
  }
}

export default new SpeedDials();
