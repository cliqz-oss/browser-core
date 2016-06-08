import { utils } from 'core/cliqz';

Components.utils.import('chrome://cliqzmodules/content/CliqzEvents.jsm');

const regexGoogleRef = /\.google\..*?\/(?:url|aclk)\?/;
const regexGoogleQuery = /\.google\..*?[#?&;]q=[^$&]+/;
const regexGoogleAdRef = /\.google\..*?\/aclk\?/;
const regexGoogleRefUrl = /url=(.+?)&/;

export default {
  init() {
    this.onTabLocationChange = this.onTabLocationChange.bind(this);
    this.onTabStateChange = this.onTabStateChange.bind(this);
    this.onNewResult = this.onNewResult.bind(this);

    CliqzEvents.sub('core.tab_location_change', this.onTabLocationChange);
    CliqzEvents.sub('core.tab_state_change', this.onTabStateChange);
    CliqzEvents.sub('autocomplete.new_result', this.onNewResult);
  },

  unload() {
    CliqzEvents.un_sub('core.tab_location_change', this.onTabLocationChange);
    CliqzEvents.un_sub('core.tab_state_change', this.onTabStateChange);
    CliqzEvents.un_sub('autocomplete.new_result', this.onNewResult);
  },

  onTabLocationChange({url}) {
    if (url === this.currentUrl || !this.lastResult) {
      return;
    }

    this.currentUrl = url;
    // here we check if user ignored our results and went to google and landed on the same url
    if (regexGoogleQuery.test(this.currentUrl) && !regexGoogleRef.test(this.currentUrl)) {
      this.afterQueryCount += 1;
    }
  },

  onTabStateChange({url, isValid}) {
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
      let googleUrl =
        utils.generalizeUrl(decodeURIComponent(googleUrlMatch[1]));

      isSameResult = cliqzResults && cliqzResults.some(function (r, i) {
        let cliqzUrl = utils.generalizeUrl(r.val);

        if (cliqzUrl === googleUrl) {
          cliqzResultType = utils.encodeResultType(r.style || r.type);
          cliqzResultIndex = i;
          return true;
        } else {
          return false;
        }
      });
    }

    this.sendCompSignal('result_compare', {
      isRedirect: true,
      isGoogleAd: isGoogleAd,
      isSameResult: isSameResult,
      cliqzResultType: cliqzResultType,
      cliqzResultIndex: cliqzResultIndex,
    });
  },

  onNewResult({result, isPopupOpen}) {
    this.afterQueryCount = 0;
    this.lastResult = result;
    this.isLastPopupOpen = isPopupOpen;
  },

  sendCompSignal(actionName, options) {
    let action = {
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

  beforeBrowserShutdown() {

  }
};
