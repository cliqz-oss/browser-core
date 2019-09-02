/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../core/prefs';

export default class Win {
  init() {
  }

  unload() {
  }

  status() {
    if (prefs.get('modules.type-filter.enabled', false)) {
      return {
        visible: true,
        type1: prefs.get('type_filter_type1', true),
        type2: prefs.get('type_filter_type2', true),
        type3: prefs.get('type_filter_type3', true)
      };
    }

    return undefined;
  }
}
