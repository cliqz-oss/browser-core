import TempSet from '../temp-set';
import console from '../../core/console';

/**
 * Caches 302 redirects so that we can ensure that the resulting request is properly
 * passed through the token logic.
 */
export default class {

  constructor() {
    this.redirectCache = new TempSet();
    this.cacheTimeout = 10000;
    this.redirectTaggerCache = new TempSet();
  }

  isFromRedirect(url) {
    return this.redirectCache.has(url);
  }

  checkRedirectStatus(state) {
    if (state.requestContext.channel.responseStatus === 302) {
      const location = state.requestContext.getResponseHeader('Location');
      if (!location) {
        // 302 without "Location" in header?
        console.log(state, '302 without "Location" in header?');
        return true;
      }
      if (location.startsWith('/')) {
        // relative redirect
        const redirectUrl = `${state.urlParts.protocol}://${state.urlParts.hostname}${location}`;
        this.redirectCache.add(redirectUrl, this.cacheTimeout);
      } else if (location.startsWith('http://') || location.startsWith('https://')) {
        // absolute redirect
        this.redirectCache.add(location, this.cacheTimeout);
      }
    }
    return true;
  }

  checkRedirect(details) {
    if (details.isRedirect) {
      this.redirectTaggerCache.add(details.requestId, this.cacheTimeout);
      return false;
    }
    return true;
  }

  confirmRedirect(details) {
    return !(this.redirectTaggerCache.has(details.requestId) || details.hasRedirected);
  }
}
