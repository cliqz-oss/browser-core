import AdblockerLib from '../platform/lib/adblocker';

import { ifModuleEnabled } from '../core/kord/inject';
import UrlWhitelist from '../core/url-whitelist';

import AdbStats from './statistics';
import EngineManager from './manager';


/**
 * Given a webrequest context from webrequest pipeline, create a `Request`
 * instance as expected by the adblocker engine.
 */
function makeRequestFromContext({
  type,
  url = '',
  urlParts,

  frameUrl,
  frameUrlParts,
} = {}) {
  return new AdblockerLib.Request({
    type,

    domain: urlParts.generalDomain || '',
    hostname: urlParts.hostname || '',
    url,

    sourceDomain: frameUrlParts.generalDomain || '',
    sourceHostname: frameUrlParts.hostname || '',
    sourceUrl: frameUrl || '',
  });
}


/**
 * Wrap @cliqz/adblocker's FilterEngine as well as additions needed for
 * Cliqz/Ghostery products.
 */
export default class Adblocker {
  constructor(webRequestPipeline) {
    this.webRequestPipeline = webRequestPipeline;

    this.whitelistChecks = [];
    this.whitelist = new UrlWhitelist('adb-blacklist');
    this.stats = new AdbStats();
    this.manager = new EngineManager();
  }

  async init() {
    // Make sure the engine is always initialized before we start listening for requests.
    await this.manager.init();
    await Promise.all([
      this.stats.init(),
      this.whitelist.init(),
      this.webRequestPipeline.action('addPipelineStep', 'onBeforeRequest', {
        name: 'adblocker',
        spec: 'blocking',
        fn: (context, response) => { this.onBeforeRequest(context, response); },
        before: ['antitracking.onBeforeRequest'],
      }),
      this.webRequestPipeline.action('addPipelineStep', 'onHeadersReceived', {
        name: 'adblocker',
        spec: 'blocking',
        fn: (context, response) => { this.onHeadersReceived(context, response); },
      }),
    ]);
  }

  unload() {
    this.stats.unload();
    this.manager.unload();

    ifModuleEnabled(
      this.webRequestPipeline.action('removePipelineStep', 'onBeforeRequest', 'adblocker'),
    );
    ifModuleEnabled(
      this.webRequestPipeline.action('removePipelineStep', 'onHeadersReceived', 'adblocker'),
    );
  }

  async reset() {
    await this.manager.reset();
    await this.manager.update();
  }

  async update() {
    await this.manager.update();
  }

  isReady() {
    return this.manager.isEngineReady();
  }

  addWhiteListCheck(fn) {
    this.whitelistChecks.push(fn);
  }

  isAdblockerEnabledForUrl(url = '', hostname = null, domain = null) {
    if (this.isReady() === false) {
      return false;
    }

    if (this.whitelist.isWhitelisted(url, hostname, domain)) {
      return false;
    }

    if (this.addWhiteListCheck.length === 0) {
      return true;
    }

    for (let i = 0; i < this.whitelistChecks.length; i += 1) {
      if (this.whitelistChecks[i](url) === true) {
        return false;
      }
    }

    return true;
  }

  /**
   * Given a `context` from webrequest pipeline, check if the request should be
   * processed by the adblocker.
   */
  shouldProcessRequest(context, response) {
    // Ignore background requests
    if (context.isBackgroundRequest()) {
      return false;
    }

    // If this request was either canceled or redirected by another step, then
    // we do not try to perform any matching on it.
    if (response.cancel === true || response.redirectUrl !== undefined) {
      return false;
    }

    // Make sure that we have a valid `url` and `frameUrl` for this request
    if (context.urlParts === null || context.frameUrlParts === null) {
      return false;
    }

    // Make sure page is not white-listed
    if (
      context.tabUrl
      && context.tabUrlParts !== null
      && this.isAdblockerEnabledForUrl(
        context.tabUrl,
        context.tabUrlParts.hostname,
        context.tabUrlParts.generalDomain,
      ) === false
    ) {
      return false;
    }

    return true;
  }

  /**
   * Process onBeforeRequest event from webrequest pipeline. This can result in
   * requests being blocked, redirected or allowed based on what the adblocker
   * engine decides.
   */
  onBeforeRequest(context, response) {
    if (context.isMainFrame) {
      this.stats.addNewPage(context);
      return false;
    }

    if (this.shouldProcessRequest(context, response) === false) {
      return false;
    }

    const result = this.manager.engine.match(makeRequestFromContext(context));

    let ret = true;
    if (result.redirect !== undefined) {
      this.stats.addBlockedUrl(context);
      response.redirectTo(result.redirect);
      ret = false;
    } else if (result.match === true) {
      this.stats.addBlockedUrl(context);
      response.block();
      ret = false;
    }

    return ret;
  }

  /**
   * Process onHeadersReceived event from webrequest pipeline. Only 'main_frame'
   * requests are processed. The only possible outcome for this step is the
   * injection of extra CSP headers to harden the page or defuse anti-adblocker
   * mechanisms.
   */
  onHeadersReceived(context, response) {
    // Only consider 'main_frame' requests
    if (context.isMainFrame === false) {
      return false;
    }

    if (this.shouldProcessRequest(context, response) === false) {
      return false;
    }

    const directives = this.manager.engine.getCSPDirectives(makeRequestFromContext(context));
    if (directives !== undefined) {
      const cspHeader = 'content-security-policy';
      const existingCSP = context.getResponseHeader(cspHeader);
      response.modifyResponseHeader(
        cspHeader,
        existingCSP === undefined ? directives : `${existingCSP}; ${directives}`,
      );
    }

    return true;
  }
}
