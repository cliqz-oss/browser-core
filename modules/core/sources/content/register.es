/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import matchPattern from './match-patterns';
import { isTopWindow } from './helpers';
import console from './console';

/**
 * Given `spec` which *must* adhere to the specification defined in [1] and a
 * `window` from the current page (either top window or iframe), decides if
 * content script should be loaded. Note that `registerContentScript` will
 * already check that `spec` is valid at registration time so the argument of
 * `shouldLoadScript` can be assumed to be valid.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts,
 */
function shouldLoadScript(window, spec) {
  // If current frame is not top window, then `allFrames` needs to be true
  if (isTopWindow(window) === false && spec.allFrames !== true) {
    return false;
  }

  let frameUrl = window.location.href;

  // Handle `matchAboutBlank` option
  if (frameUrl === 'about:blank' || frameUrl === 'about:srcdoc') {
    if (spec.matchAboutBlank !== true) {
      return false;
    }

    // From: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts
    // > Insert the content scripts into pages whose URL is "about:blank" or
    // > "about:srcdoc", if the URL of the page that opened or created this page
    // > matches the patterns specified in the rest of the content_scripts key.
    //
    // Here we change `frameUrl` to the href of the parent if available so that
    // other conditions like `matches` can be tested against it to decide if
    // injection should be performed.
    if (!window.parent) {
      return false;
    }

    frameUrl = window.parent.location.href;
  }

  // If `frameUrl` matches at least one pattern from `excludeMatches` then abort
  if (spec.excludeMatches !== undefined) {
    for (const pattern of spec.excludeMatches) {
      if (matchPattern(pattern, frameUrl)) {
        return false;
      }
    }
  }

  // Check if `frameUrl` matches at least one pattern from `matches`
  for (const pattern of spec.matches) {
    if (matchPattern(pattern, frameUrl)) {
      return true;
    }
  }

  // If no valid condition was found then we should not inject
  return false;
}

/**
 * Globally hold content scripts for all modules
 */
const CONTENT_SCRIPTS = [];

/**
 * Register a new content-script defined by `spec`. The argument should have the
 * following specification:
 *
 * Examples:
 *  {
 *    module: 'myModule', // name of module
 *    matches: ['<all_urls>'], // mandatory, list of match patterns
 *    excludeMatches: [], // optional
 *    allFrames: true, // optional, default to `false`
 *    matchAboutBlank: true, // optional, default to `false`
 *    js: [() => { ... }], // mandatory, array of functions to inject
 *  }
 */
export function registerContentScript(spec) {
  if (spec.module === undefined) {
    console.error('"module" property should be specified in content.es', spec);
    return;
  }

  if (Array.isArray(spec.js) === false) {
    console.error('"js" should be an array of functions', spec);
    return;
  }

  if (Array.isArray(spec.matches) === false) {
    console.error('"matches" should be an array of match patterns', spec);
    return;
  }

  if (spec.excludeMatches !== undefined && Array.isArray(spec.excludeMatches) === false) {
    console.error('"excludeMatches" should either be undefined or an array of match patterns', spec);
    return;
  }

  CONTENT_SCRIPTS.push(spec);
}


/**
 * Inject content scripts from global `CONTENT_SCRIPTS` (populated by
 * `registerContentScript`) into the current window. State of the App can be
 * found in the `CLIQZ` argument and is used to know which modules are enabled.
 * Content scripts from disabled modules are ignored.
 *
 * Returns a collection of callbacks used to trigger content script actions from
 * background. These actions are optionally returned by functions registered in
 * the `js` field given to `registerContentScript`.
 */
export function runContentScripts(window, chrome, CLIQZ) {
  const contentScriptActions = {};

  for (const spec of CONTENT_SCRIPTS) {
    const { module, js } = spec;
    const { isEnabled } = CLIQZ.app.modules[module] || { isEnabled: false };

    if (isEnabled && shouldLoadScript(window, spec)) {
      for (const script of js) {
        try {
          const actions = script(window, chrome, CLIQZ) || {};
          contentScriptActions[module] = {
            ...contentScriptActions[module],
            ...actions,
          };
        } catch (e) {
          console.error(`CLIQZ content-script failed: ${e} ${e.stack}`);
        }
      }
    }
  }

  return contentScriptActions;
}
