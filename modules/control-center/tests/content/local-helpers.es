/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import config from '../../../core/config';
import { Subject } from '../../core/test-helpers-freshtab';

export default class extends Subject {
  load() {
    return super.load({
      buildUrl: `/${config.testsBasePath}/control-center/index.html`
    });
  }
}
