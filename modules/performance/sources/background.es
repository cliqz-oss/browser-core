import utils from '../core/utils';
import { generalizeUrl } from '../core/url';
import background from '../core/base/background';

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

export default background({
  enabled() {
    return true;
  },

  init() {
  },

  unload() {
  },

  beforeBrowserShutdown() {
  },

  events: {
    'content:location-change': function onTabLocationChange({ url }) {
      // create a telemetry signal for each location change
      utils.telemetry({
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

    // 'autocomplete.new_result': function onNewResult({ result, isPopupOpen }) {
    //
    'ui:results': function onNewResult({ results, isPopupOpen }) {
      this.afterQueryCount = 0;
      this.lastResult = results;
      this.isLastPopupOpen = isPopupOpen;
    },
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
    utils.telemetry(action);
  },

});
