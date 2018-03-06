/* eslint no-use-before-define: ["error", { "classes": false }] */
import events from '../../core/events';
import utils from '../../core/utils';
import { equals, cleanMozillaActions } from '../../core/url';
import { getCurrentTabId } from '../../core/tabs';

function mozEquals(url1, url2) {
  return equals(cleanMozillaActions(url1)[1], cleanMozillaActions(url2)[1]);
}

export function getDeepResults(rawResult, type) {
  const deepResults = (rawResult.data && rawResult.data.deepResults) || [];
  const deepResultsOfType = deepResults.find(dr => dr.type === type) || {
    links: [],
  };
  return deepResultsOfType.links || [];
}

export default class BaseResult {
  constructor(rawResult, allResultsFlat = []) {
    this.rawResult = {
      ...{ data: {} },
      ...rawResult,
    };
    this.actions = {};

    // throw if main result is duplicate
    // TODO: move deduplication to autocomplete module
    if (this.rawResult.url) {
      if (allResultsFlat.some(url => mozEquals(url, this.url))) {
        throw new Error('duplicate');
      } else {
        allResultsFlat.push(this.url);
      }
    }

    // TODO: move deduplication to autocomplete module
    this.rawResult.data.deepResults = (this.rawResult.data.deepResults || [])
      .map((deepResult) => {
        const type = deepResult.type;
        const links = getDeepResults(this.rawResult, type).reduce((filtered, result) => {
          let resultUrl;
          // TODO: fix the data!!!
          if (type === 'images') {
            resultUrl = (result.extra && result.extra.original_image) || result.image;
          } else {
            resultUrl = result.url;
          }

          const isDuplicate = allResultsFlat.some(url => mozEquals(url, resultUrl));
          if (isDuplicate) {
            return filtered;
          }
          allResultsFlat.push(resultUrl);
          return [
            ...filtered,
            result,
          ];
        }, []);
        return {
          type,
          links,
        };
      });
  }

  get template() {
    return 'generic';
  }

  get query() {
    return this.rawResult.text;
  }

  get urlbarValue() {
    return this.displayUrl || this.url;
  }

  get cssClasses() {
    const classes = [];
    if (this.rawResult.isCluster) {
      classes.push('history-cluster');
    }
    return classes.join(' ');
  }

  get kind() {
    return this.rawResult.data.kind || [''];
  }

  get title() {
    return this.rawResult.title;
  }

  get logo() {
    const urlDetails = utils.getDetailsFromUrl(this.rawResult.url);
    return utils.getLogoDetails(urlDetails);
  }

  get localSource() {
    const data = this.rawResult.data || {};
    return data.localSource || this.rawResult.style || '';
  }

  get friendlyUrl() {
    const urlDetails = utils.getDetailsFromUrl(this.rawResult.url);
    return urlDetails.friendly_url;
  }

  get isActionSwitchTab() {
    return this.localSource.indexOf('switchtab') !== -1;
  }

  get isBookmark() {
    return this.localSource.indexOf('bookmark') !== -1;
  }

  get isCliqzAction() {
    return this.rawResult.url && this.rawResult.url.indexOf('cliqz-actions') === 0;
  }

  get isAdult() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.adult;
  }

  get isCalculator() {
    const data = this.rawResult.data || {};
    return data.template === 'calculator';
  }

  get isCurrency() {
    const data = this.rawResult.data || {};
    return data.template === 'currency';
  }

  get isSuggestion() {
    const data = this.rawResult.data || {};
    return data.template === 'suggestion';
  }

  get icon() {
    let icon;

    if (this.isBookmark) {
      icon = 'bookmark';
    }

    if (this.isActionSwitchTab) {
      icon = 'switchtab';
    }

    return icon;
  }

  get url() {
    let url = this.rawResult.url;
    if (this.isAd && this.urlAd) {
      url = this.urlAd;
    }

    if (this.isActionSwitchTab) {
      return `moz-action:switchtab,${JSON.stringify({ url: encodeURI(url) })}`;
    }
    return url;
  }

  get rawUrl() {
    return this.rawResult.url;
  }

  get displayUrl() {
    return this.rawResult.url;
  }

  get description() {
    return this.rawResult.description || '';
  }

  get image() {
    return this.rawResult.image;
  }

  get source() {
    const urlDetails = utils.getDetailsFromUrl(this.rawUrl);
    return urlDetails.domain;
  }

  get updated() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.last_updated_ago;
  }

  get isAd() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.is_ad && utils.getPref('offersDropdownSwitch', false);
  }

  get urlAd() {
    const data = this.rawResult.data || {};
    const extra = data.extra || {};
    return extra.url_ad;
  }

  get selectableResults() {
    return [
      ...(this.url ? [this] : []),
    ];
  }

  get allResults() {
    return [
      ...this.selectableResults,
    ];
  }

  isUrlMatch(href) {
    return equals(this.rawUrl, href) || equals(this.url, href);
  }

  findResultByUrl(href) {
    return this.allResults.find(r => r.isUrlMatch(href));
  }

  hasUrl(href) {
    return Boolean(this.findResultByUrl(href));
  }

  get isHistory() {
    return this.kind[0] === 'H';
  }

  get isDeletable() {
    return this.isHistory;
  }

  click(window, href, ev, resultChain = []) {
    if (this.isUrlMatch(href)) {
      const newTab = ev.altKey || ev.metaKey || ev.ctrlKey || ev.button === 1;
      const action = ev.code === 'Enter' ? 'enter' : 'click';
      // TODO: need to handle 'go-to' button (right arrow in URL bar)
      const parentResult = resultChain[0];

      events.pub('ui:click-on-url', {
        url: this.url,
        query: this.query,
        rawResult: Object.assign({}, parentResult && {
          kind: parentResult.rawResult.kind,
          type: parentResult.rawResult.type,
          provider: parentResult.rawResult.provider,
        }, this.rawResult),
        isNewTab: Boolean(newTab),
        isPrivateMode: utils.isPrivateMode(window),
        isPrivateResult: utils.isPrivateResultType(this.kind),
        isFromAutocompletedURL: this.isAutocompleted && ev.constructor.name === 'KeyboardEvent',
        windowId: utils.getWindowID(window),
        tabId: getCurrentTabId(window),
        action,
      });

      // TODO: do not use global
      /* eslint-disable */
      window.CLIQZ.Core.urlbar.value = href;
      /* eslint-enable */
      // delegate to Firefox for full set of features like switch-to-tab
      // and all related telemetry probes
      if (!newTab) {
        window.CLIQZ.Core.urlbar.handleCommand(ev, 'current');
      } else {
        // for new tab we do not want to lose the focus and/or close the dropdown
        utils.openLink(window, this.rawUrl || this.url, true, false, false, false);
        // but we still want to report the correct search telemetry signal to FF
        // for the search results
        if (this.template === 'search') {
          window.BrowserSearch.recordSearchInTelemetry(Services.search.defaultEngine, 'urlbar');
        }
      }
    } else {
      this.findResultByUrl(href).click(window, href, ev, [...resultChain, this]);
    }
  }

  /*
   * Lifecycle hook
   */
  didRender(...args) {
    const allButThisResult = this.allResults.slice(1);
    allButThisResult.forEach(result => result.didRender(...args));
  }
}
