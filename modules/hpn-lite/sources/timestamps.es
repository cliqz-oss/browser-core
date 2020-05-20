/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Contains functions to generate timestamps used in Human Web messages.
 * As a general rule, all timestamps in the context of Human Web will be in UTC.
 *
 * To mitigate the risk of fingerprinting based on clock drift, messages
 * should not include high resolution timestamps, but instead should be rounded.
 */

function getTrustedUtcTime() {
  // Note: the approach that is used on Desktop to prevent messages
  // being sent out with a wrong system clock cannot be ported,
  // as it is inheritely based on frequent wakeups (hpnv2/trusted-clock).
  //
  // For now, assume that the system clock is accurate enough.
  // The reason for this function is only to have all sensitive time operations
  // at one place if we want to add some heuristics here.
  return new Date();
}

export function getTimeAsYYYYMMDD(now) {
  const ts = now || getTrustedUtcTime();
  return ts.toISOString().replace(/[^0-9]/g, '').slice(0, 8);
}

export function getTimeAsYYYYMMDDHH(now) {
  const ts = now || getTrustedUtcTime();
  return ts.toISOString().replace(/[^0-9]/g, '').slice(0, 10);
}
