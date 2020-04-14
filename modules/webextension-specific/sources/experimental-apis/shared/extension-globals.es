/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals XPCOMUtils */
const globals = {
  get windowTracker() {
    return globals.ExtensionParent.apiManager.global.windowTracker;
  },
  get tabTracker() {
    return globals.ExtensionParent.apiManager.global.tabTracker;
  },
  get EventManager() {
    return globals.ExtensionCommon.EventManager;
  },
  get ExtensionError() {
    return globals.ExtensionUtils.ExtensionError;
  },
};

XPCOMUtils.defineLazyModuleGetters(globals, {
  Services: 'resource://gre/modules/Services.jsm',
  ExtensionParent: 'resource://gre/modules/ExtensionParent.jsm',
  ExtensionCommon: 'resource://gre/modules/ExtensionCommon.jsm',
  ExtensionUtils: 'resource://gre/modules/ExtensionUtils.jsm',
});

export default globals;
