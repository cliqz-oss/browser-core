/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import AdblockerLib from '../platform/lib/adblocker';
import { browser } from '../platform/globals';

import { ifModuleEnabled } from '../core/kord/inject';
import UrlWhitelist from '../core/url-whitelist';

import AdbStats from './statistics';
import EngineManager from './manager';
import logger from './logger';


/**
 * Given a webrequest context from webrequest pipeline, create a `Request`
 * instance as expected by the adblocker engine.
 */
function makeRequestFromContext(url, urlParts, {
  tabId,
  requestId,
  type,

  frameUrl,
  frameUrlParts,

  tabUrl,
  tabUrlParts,
} = {}) {
  const subFrame = type === 'sub_frame';
  return new AdblockerLib.Request({
    tabId,
    requestId,

    type,

    domain: urlParts.generalDomain || '',
    hostname: urlParts.hostname || '',
    url,

    // In case of a 'sub_frame' request, the partiness for the adblocker needs to
    // be slightly different. Since it's possible that `url` and `frameUrl` are
    // the same in this case, we use `tabUrl` as origin instead.
    sourceDomain: (subFrame ? tabUrlParts.generalDomain : frameUrlParts.generalDomain) || '',
    sourceHostname: (subFrame ? tabUrlParts.hostname : frameUrlParts.hostname) || '',
    sourceUrl: (subFrame ? tabUrl : frameUrl) || '',
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

  /**
   * Given a `context` from webrequest pipeline, check if the request should be
   * processed by the adblocker.
   */
  shouldProcessRequest(context, response) {
    // Make sure engine is ready before processing requests
    if (this.isReady() === false) {
      return false;
    }

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

    // Check Cliqz whitelist (applies on tabUrl)
    if (
      context.tabUrl
      && context.tabUrlParts !== null
      && this.whitelist.isWhitelisted(
        context.tabUrl,
        context.tabUrlParts.hostname,
        context.tabUrlParts.generalDomain,
      )
    ) {
      return false;
    }

    // Make sure request is not whitelisted (applies on request context)
    if (this.whitelistChecks.length !== 0) {
      for (let i = 0; i < this.whitelistChecks.length; i += 1) {
        if (this.whitelistChecks[i](context) === true) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Process `request` with adblocker engine. If request is blocked or
   * redirected, then return value is `false` (which means that pipeline will
   * be terminated); otherwise `true` is returned.
   */
  processRequest(request, response, context) {
    const { match, redirect } = this.manager.engine.match(request);

    if (redirect !== undefined) {
      this.stats.addBlockedUrl(context);
      response.redirectTo(redirect.dataUrl);
      return false;
    }

    if (match === true) {
      this.stats.addBlockedUrl(context);
      response.block();
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
    if (this.shouldProcessRequest(context, response) === false) {
      return false;
    }

    if (context.isMainFrame) {
      this.stats.addNewPage(context);

      // HTML filtering is a feature from the adblocker which is able to
      // intercept streaming responses from main documents before they are
      // parsed by the browser. This means that we have a chance to remove
      // elements (e.g.: script tags) before they get a chance to be evaluated.
      // This is a powerful feature which needs to be wielded with extra care.
      // It is only possible thanks to the `filterResponseData` API from
      // Firefox' webRequest. It is thus not enabled for any browser other than
      // Firefox.
      //
      // There is currently only one kind of filters which are supported:
      // ##^script:has-text(...) which allows to remove script tags if a
      // substring or RegExp is found within.
      this.manager.engine.performHTMLFiltering(
        browser,
        makeRequestFromContext(
          context.url,
          context.urlParts,
          context,
        ),
      );

      return false;
    }

    let ret = this.processRequest(
      makeRequestFromContext(context.url, context.urlParts, context),
      response,
      context,
    );

    // If the request was not blocked (i.e.: `ret` is `true`), then we check if
    // the request has a `cnameUrl` attribute; which means that CNAME
    // uncloaking was performed in the webrequest-pipeline. We use this
    // information to replay the request through the adblocker engine with the
    // CNAME URL and check if it should be blocked.
    if (
      // This means that request was not blocked/redirected yet.
      ret === true

      // Check if webrequest-pipeline attached CNAME information to request.
      && context.cnameUrl
      && context.cnameUrlParts

      // Only perform second check if domain of `cnameUrl` is different from
      // domain of `url`. This avoid extra work in case CNAME is still a 1p.
      && context.cnameUrlParts.generalDomain !== context.urlParts.generalDomain
    ) {
      ret = this.processRequest(
        makeRequestFromContext(context.cnameUrl, context.cnameUrlParts, context),
        response,
        context,
      );

      if (ret === false) {
        logger.log('first-party tracker blocked', context);
      }
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

    const directives = this.manager.engine.getCSPDirectives(makeRequestFromContext(
      context.url,
      context.urlParts,
      context,
    ));

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
