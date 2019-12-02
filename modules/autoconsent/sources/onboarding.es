/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../core/prefs';
import telemetry from '../core/services/telemetry';

const ONBOARDING_PREF_PREFIX = 'autoconsent.onboarding.';
const ONBOARDING_STATUS_PREF = `${ONBOARDING_PREF_PREFIX}status`;
const DEFER_INTERVALS = [
  3600, // one hour
  86400, // one day
  86400, // one day
];

export const ONBOARDING_STATUS = {
  NOT_COMPLETED: 'NOT_COMPLETED',
  DEFERRED: 'DEFERRED',
  COMPLETED: 'COMPLETED',
};

export function getOnboardingStatus() {
  try {
    return JSON.parse(prefs.get(ONBOARDING_STATUS_PREF, ONBOARDING_STATUS.NOT_COMPLETED));
  } catch (e) {
    return {
      status: ONBOARDING_STATUS.NOT_COMPLETED,
    };
  }
}

export function setOnboardingStatus(status) {
  prefs.set(ONBOARDING_STATUS_PREF, JSON.stringify(status));
}

export function setOnboardingWasCompleted() {
  prefs.set(ONBOARDING_STATUS_PREF, { status: ONBOARDING_STATUS.COMPLETED });
  telemetry.push({
    action: 'completed',
  }, 'metrics.autoconsent.onboarding');
}

export function setOnboardingWasDeferred() {
  const status = getOnboardingStatus();
  status.status = ONBOARDING_STATUS.DEFERRED;
  if (status.timesDeferred && status.timesDeferred >= DEFER_INTERVALS.length) {
    // maximum number of times deferred - disable autoconsent
    prefs.set('modules.autoconsent.enabled', false);
    status.timesDeferred = 0;
  } else {
    // add delay based on defer intervals
    status.timesDeferred = status.timesDeferred || 0;
    status.timesDeferred += 1;
    status.delayUntil = Date.now() + 1000 * DEFER_INTERVALS[status.timesDeferred - 1];
  }
  setOnboardingStatus(status);
  telemetry.push({
    action: 'deferred',
    times: status.timesDeferred,
  }, 'metrics.autoconsent.onboarding');
  return status;
}

export function onBoardingWasDismissed() {
  telemetry.push({
    action: 'dismissed',
  }, 'metrics.autoconsent.onboarding');
}

export function shouldShowOnboardingPopup() {
  const status = getOnboardingStatus();
  return (status.status === ONBOARDING_STATUS.NOT_COMPLETED
    || (status.status === ONBOARDING_STATUS.DEFERRED
      && status.timesDeferred < DEFER_INTERVALS.length
      && status.delayUntil < Date.now())
  );
}
