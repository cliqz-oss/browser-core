import TempSet from '../temp-set';

/**
 * Caches 302 redirects so that we can ensure that the resulting request is properly
 * passed through the token logic.
 */
export default class {

  constructor() {
    this.redirectCache = new TempSet();
    this.cacheTimeout = 10000;
  }

  isFromRedirect(url) {
    return this.redirectCache.has(url);
  }

  checkRedirectStatus(state) {
    if (state.requestContext.channel.responseStatus === 302) {
      const location = state.getResponseHeader('Location');
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
}
