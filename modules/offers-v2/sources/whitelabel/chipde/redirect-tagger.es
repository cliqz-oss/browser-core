import { getGeneralDomain } from '../../../core/tlds';
import LRU from '../../../core/LRU';

// Monitor web requests. If chip.de ad server is detected, then track
// the chain of redirection. After the destination page is reached,
// notify a listener.

export default class RedirectTagger {
  /**
   * @constructor
   * @param {(injected module)} webrequestPipeline
   * @param {string => *} onFinalDomain  Called with the general domain
   *   name (in terms of `tlds` module) when `x.chip.de` redirection
   *   is finished.
   */
  constructor(webrequestPipeline, onFinalDomain) {
    this.pipeline = webrequestPipeline;
    this.onFinalDomain = onFinalDomain;
    this.onRequest = this.onRequest.bind(this);
    // We can't properly cleanup accounting for referrers. Instead, use
    // a fixed-size storage, in which old entries are deleted automatically.
    // The maximal number of redirects from chip is five.
    this.referrers = new LRU(16);
  }

  init() {
    this.referrers.reset();
    this.pipeline.action('addPipelineStep',
      'onHeadersReceived',
      {
        name: 'offers-chipde-redirect-handler',
        spec: 'collect',
        fn: this.onRequest,
      });
  }

  unload() {
    this.pipeline.action(
      'removePipelineStep',
      'onHeadersReceived',
      'offers-chipde-redirect-handler'
    );
    this.referrers.reset();
  }

  onRequest(state) {
    //
    // Track only x.chip.de redirection
    //
    if (state.type !== 'main_frame') {
      return true;
    }
    const url = state.url;
    if (!this.referrers.has(url)) {
      const domain = state.urlParts.hostname;
      if (domain !== 'x.chip.de') {
        return true;
      }
    }
    //
    // If not a redirection, it is a final page
    //
    if (
      !state.statusCode
      || (state.statusCode < 300)
      || (state.statusCode >= 400)
    ) {
      this.onFinalPage(state.url);
      return true;
    }
    //
    // Register a redirection step
    //
    const location = state.getResponseHeader('Location');
    if (!location) {
      return true;
    }
    if (location.startsWith('http://') || location.startsWith('https://')) {
      this.onRedirect(url, location);
    } else {
      const sep = location.startsWith('/') ? '' : '/';
      const redirectUrl = `${state.urlParts.protocol}//${state.urlParts.hostname}${sep}${location}`;
      this.onRedirect(url, redirectUrl);
    }
    return true;
  }

  onRedirect(from, to) {
    this.referrers.set(to, from);
    // Browser can silently switch from http:// to https:// due to HTTP
    // Strict Transport Security, therefore track also https-version.
    if (to.startsWith('http:')) {
      this.referrers.set(`https:${to.substring(5)}`, from);
    }
  }

  onFinalPage(url) {
    const domain = getGeneralDomain(url);
    if (domain) {
      this.onFinalDomain(domain);
    }
  }
}
