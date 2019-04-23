import { interval } from 'rxjs';
import { mergeMap, withLatestFrom, take, map, filter } from 'rxjs/operators';
import telemetry from '../core/services/telemetry';
import { generalizeUrl } from '../core/url';
import ObservableProxy from '../core/helpers/observable-proxy';
import { chrome } from '../platform/globals';

const regexGoogleRef = /\.google\..*?\/(?:url|aclk)\?/;
const regexGoogleQuery = /\.google\..*?[#?&;]q=[^$&]+/;
const regexGoogleAdRef = /\.google\..*?\/aclk\?/;
const regexGoogleRefUrl = /url=(.+?)&/;

const _VERTICAL_ENCODINGS = {
  people: 'p',
  news: 'n',
  video: 'v',
  hq: 'h',
  bm: 'm',
  reciperd: 'r',
  game: 'g',
  movie: 'o'
};

const _encodeSources = sources => sources.toLowerCase().split(', ').map((s) => {
  if (s.indexOf('cache') === 0) { // to catch 'cache-*' for specific countries
    return 'd';
  }
  return _VERTICAL_ENCODINGS[s] || s;
});

const _encodeCliqzResultType = (type) => {
  const pos = type.indexOf('sources-');
  if (pos !== -1) {
    return _encodeSources(type.substr(pos + 8));
  }
  return [];
};

const encodeResultType = (type) => {
  if (type.indexOf('action') !== -1) return ['T'];
  if (type.indexOf('cliqz-results') === 0) return _encodeCliqzResultType(type);
  if (type.indexOf('cliqz-pattern') === 0) return ['C'];
  if (type === 'cliqz-extra') return ['X'];
  if (type === 'cliqz-series') return ['S'];
  if (type === 'cliqz-suggestion') return ['Z'];

  if (type.indexOf('bookmark') === 0
    || type.indexOf('tag') === 0) return ['B'].concat(_encodeCliqzResultType(type));

  if (type.indexOf('favicon') === 0
    || type.indexOf('history') === 0) return ['H'].concat(_encodeCliqzResultType(type));

  // cliqz type = "cliqz-custom sources-X"
  if (type.indexOf('cliqz-custom') === 0) return type.substr(21);

  return type; // should never happen
};

export default {
  init() {
    this.onHeadersReceived = this.onHeadersReceived.bind(this);
    chrome.webRequest.onHeadersReceived.addListener(
      this.onHeadersReceived,
      {
        urls: ['<all_urls>'],
        types: ['main_frame']
      }
    );

    this.clicksEventProxy = new ObservableProxy();
    this.locationChangeEventProxy = new ObservableProxy();
    const clicks$ = this.clicksEventProxy.observable;
    const locationChanges$ = this.locationChangeEventProxy.observable;

    // For every click (or enter) on a cliqz result, start a new stream that
    // will wait for upcoming page load
    clicks$.pipe(
      mergeMap(({ url, resultType }) => interval(5000).pipe(
        // wait only once
        take(1),
        // merge with location-change that matches the url
        withLatestFrom(locationChanges$.pipe(filter(({ url: u }) => u === url))),
        map(([, { statusCode }]) => ({ resultType, statusCode })),
      ))
    )
      .subscribe(({ statusCode, resultType }) => {
        telemetry.push({
          type: 'performance',
          action: 'response',
          response_code: statusCode,
          result_type: resultType,
          v: 2,
        });
      });

    this.onVisited = this.onVisited.bind(this);
    chrome.history.onVisited.addListener(this.onVisited);
  },

  unload() {
    chrome.history.onVisited.removeListener(this.onVisited);
    chrome.webRequest.onHeadersReceived.removeListener(this.onHeadersReceived);
  },

  events: {
    'content:location-change': function onTabLocationChange({ url }) {
      // create a telemetry signal for each location change
      telemetry.push({
        type: 'navigation',
        action: 'location_change',
      });

      if (url === this.currentUrl || !this.lastResult) {
        return;
      }

      this.currentUrl = url;
      // here we check if user ignored our results and went to google and landed on the same url
      if (regexGoogleQuery.test(this.currentUrl) && !regexGoogleRef.test(this.currentUrl)) {
        this.afterQueryCount += 1;
      }
    },

    'core.tab_state_change': function onTabStateChange({ url, isValid }) {
      const isGoogleRef = regexGoogleRef.test(url);

      if (!isValid || !isGoogleRef) {
        return;
      }

      const isGoogleAd = regexGoogleAdRef.test(url);
      const googleUrlMatch = !isGoogleAd && url.match(regexGoogleRefUrl);
      const cliqzResults = this.lastResult;

      let cliqzResultType = null;
      let cliqzResultIndex = null;
      let isSameResult = false;

      if (!isGoogleAd && this.isLastPopupOpen && googleUrlMatch) {
        const googleUrl = generalizeUrl(decodeURIComponent(googleUrlMatch[1]));

        isSameResult = cliqzResults && cliqzResults.some((r, i) => {
          const cliqzUrl = generalizeUrl(r.url);

          if (cliqzUrl === googleUrl) {
            cliqzResultType = encodeResultType(r.style || r.type);
            cliqzResultIndex = i;
            return true;
          }
          return false;
        });
      }

      this.sendCompSignal('result_compare', {
        isRedirect: true,
        isGoogleAd,
        isSameResult,
        cliqzResultType,
        cliqzResultIndex,
      });
    },

    'ui:results': function onNewResult({ results, isPopupOpen }) {
      this.afterQueryCount = 0;
      this.lastResult = results;
      this.isLastPopupOpen = isPopupOpen;
    },

    'ui:click-on-url': function onClick({ url, rawResult: { style, type } }) {
      this.clicksEventProxy.next({
        url,
        resultType: style || type,
      });
    }
  },

  sendCompSignal(actionName, options) {
    const action = {
      type: 'performance',
      redirect: options.isRedirect,
      action: actionName,
      query_made: this.afterQueryCount,
      popup: this.isLastPopupOpen,
      same_result: options.isSameResult,
      result_type: options.cliqzResultType,
      result_position: options.cliqzResultIndex,
      is_ad: options.isGoogleAd,
      v: 1,
    };
    telemetry.push(action);
  },

  onHeadersReceived({ url, statusCode }) {
    this.locationChangeEventProxy.next({
      url,
      statusCode,
    });
  },

  onVisited() {
    telemetry.push({ visitsCount: 1 }, 'metrics.history.visits.count');
  },

};
