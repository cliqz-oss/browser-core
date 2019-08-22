/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  defaultConfig,
  generateNewsResponse,
  getActiveConfig,
  checkSettingsInt,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab interactions with settings switches', function () {
  let subject;

  beforeEach(function () {
    subject = new Subject({
      injectTestUtils: true,
    });
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithOneHistory();
    subject.respondsWithEmptyStats();
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: generateNewsResponse()[6]
    });
  });

  checkSettingsInt({
    responseConfig: getActiveConfig(),
    subject: () => subject,
  });

  checkSettingsInt({
    defaultState: false,
    responseConfig: defaultConfig,
    subject: () => subject,
  });
});
