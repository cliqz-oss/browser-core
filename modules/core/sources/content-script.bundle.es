/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * This file is the entry-point for content scripts for navigation-extension. At
 * build time, it will bundle the code from `content.es` for each module enabled
 * in the config (or nothing if `content.es` does not exist for a given module);
 * and take care of running selectively the scripts for modules which are
 * enabled and whose constraints are satisfied (as defined when registering the
 * content script with `registerContentScript`; typically `matches`,
 * `allFrames`, `matchAboutBlank`, etc.)
 *
 * Here we give an overview of how this mechanism works and how modules can
 * define their own content script(s). Conceptually, each module defining a
 * `content.es` has a chance to create its own content-script. This file
 * contains both the script (i.e.: `js`) to inject, as well as the specification
 * of when to inject it (the API is very similar to Firefox WebExtension API
 * `browser.contentScripts.register` or the `content_scripts` section of the
 * manifest).
 *
 * A module can inject zero, one or multiple content scripts from its
 * `content.es`, using the `registerContentScript` helper function defined in
 * `core/content/register.es`. This function takes one argument. Here is an
 * example:
 *
 *    // File: `modules/adblocker/sources/content.es`
 *    import { registerContentScript } from '../core/content/register';
 *
 *    registerContentScript({
 *      module: 'adblocker', // this should be the name of the module
 *      matches: ['<all_urls>'], // match any URL
 *      allFrames: true, // include iframes
 *      matchAboutBlank: true, // include iframes with `about:blank` as source
 *      js: [(window, chrome, CLIQZ) => {
 *        // Do the thing...
 *      }],
 *    })
 *
 *  The `js` attribute accepts an array of functions to evaluate in a given
 *  frame (here we give only one) and the `registerContentScript` function can
 *  be called multiple times for each module (but typically only once).
 *
 *  Functions injected can optionally return an object containing `actions` for
 *  this specific module's content-script. They can be called from background
 *  using the following core action:
 *
 *    this.core.action(
 *      'callContentAction',
 *      moduleName,
 *      actionName,
 *      { windowId: tabId }, // or { url } to target tabs by URL
 *      ...payloadForActionHandler,
 *    );
 *
 *  When building the extension with `fern.js`, our build-system will collect
 *  all the `content.es` files from enabled modules and bundle them together.
 *  This file is called `content-script.bundle.es`. It is registered in the
 *  manifest for Cliqz extension in `specific/browser/manifest.json`; which
 *  means it will be injected in every page.
 *
 *  This does not mean that the scripts registered by all modules run in every
 *  frame; the `registerContentScript` function only registers a new content
 *  script, but the injection only triggers if the following conditions are met:
 *
 *  1. the module's background needs to be enabled. For example if the adblocker
 *  is turned-off with the pref 'modules.adblocker.enabled' set to `false`, then
 *  even if `content-script.bundle.es` contains the adblocker's content-script,
 *  it will not run (because the module is disabled).
 *
 *  2. conditions specified when calling `registerContentScript` need to be
 *  satisfied. This includes `matches`, `allFrames` or `matchAboutBlank`.
 *
 *  When all conditions are met, then the functions provided in `js` will be
 *  executed in the context of the frame.
 *
 *  For more information about how all of this is implemented, see top-level
 *  comment in `core/content/run.es`.
 */

import '../module-content-script'; // Load content scripts from modules
import injectContentScripts from './content/run';

injectContentScripts();
