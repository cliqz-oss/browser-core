/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  checkSettingsUI,
  getActiveConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

context('Freshtab settings panel UI', function () {
  let subject;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();
  });

  checkSettingsUI({
    defaultState: false,
    subject: () => subject,
  });

  checkSettingsUI({
    responseConfig: getActiveConfig(),
    subject: () => subject,
  });
});
