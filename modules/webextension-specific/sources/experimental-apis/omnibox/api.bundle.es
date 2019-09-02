/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals ExtensionAPI */
import Dropdown from './dropdownapi';

let dropdown = null;

global.omnibox2 = class extends ExtensionAPI {
  getAPI(context) {
    if (!dropdown) {
      dropdown = new Dropdown(context.extension);
      context.extension.callOnClose(dropdown);
    }
    return {
      omnibox2: dropdown.getAPI(context),
    };
  }
};
