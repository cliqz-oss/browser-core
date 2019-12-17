/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const NUMBER = { type: 'integer', minimum: 0 };

export default [{
  name: 'analyses.autoconsent.onboarding',
  description: `Aggregation of user interactions with the cookie consent onboarding popup. Allows
us to measure the engagement and click-through rates of this popup.`,
  sendToBackend: {
    version: 1,
  },
  generate: ({ records }) => {
    const onboardingMessages = records.get('metrics.autoconsent.onboarding');
    const controlCenterChange = records.get('metrics.legacy.control_center.autoconsent_switch');
    if (onboardingMessages.length === 0) {
      return [];
    }
    const result = {
      shown: 0,
      dismissed: 0,
      deferred: 0,
      deferredCounter: 0,
      completed: 0,
      ccInteractions: controlCenterChange.length,
      moduleDisabled: controlCenterChange.length > 0
        && controlCenterChange[controlCenterChange.length - 1].state === 'off_all',
      sitesWhitelisted: controlCenterChange.filter(m => m.state === 'inactive').length,
    };
    onboardingMessages.forEach((message) => {
      const { action } = message;
      switch (action) {
        case 'completed':
          result.completed += 1;
          break;
        case 'deferred':
          result.deferred += 1;
          result.deferredCounter = Math.max(result.deferredCounter, message.times);
          break;
        case 'dismissed':
          result.dismissed += 1;
          break;
        case 'shown':
          result.shown += 1;
          break;
        default:
          break;
      }
    });
    return [result];
  },
  schema: {
    properties: {
      shown: NUMBER,
      dismissed: NUMBER,
      deferred: NUMBER,
      deferredCounter: NUMBER,
      completed: NUMBER,
      ccInteractions: NUMBER,
      moduleDisabled: { type: 'boolean ' },
      sitesWhitelisted: NUMBER,
    },
  },
}];
