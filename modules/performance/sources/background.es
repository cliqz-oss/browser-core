import utils from 'core/utils';
import background from 'core/base/background';

const regexGoogleRef = /\.google\..*?\/(?:url|aclk)\?/;
const regexGoogleQuery = /\.google\..*?[#?&;]q=[^$&]+/;
const regexGoogleAdRef = /\.google\..*?\/aclk\?/;
const regexGoogleRefUrl = /url=(.+?)&/;

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
      const cliqzResults = this.lastResult && this.lastResult._results;

      let cliqzResultType = null;
      let cliqzResultIndex = null;
      let isSameResult = false;

      if (!isGoogleAd && this.isLastPopupOpen && googleUrlMatch) {
        const googleUrl =
          utils.generalizeUrl(decodeURIComponent(googleUrlMatch[1]));

        isSameResult = cliqzResults && cliqzResults.some((r, i) => {
          const cliqzUrl = utils.generalizeUrl(r.val);

          if (cliqzUrl === googleUrl) {
            cliqzResultType = utils.encodeResultType(r.style || r.type);
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

    'autocomplete.new_result': function onNewResult({ result, isPopupOpen }) {
      this.afterQueryCount = 0;
      this.lastResult = result;
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
