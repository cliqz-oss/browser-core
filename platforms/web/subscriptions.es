/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function toggleSubscription(/* type, subtype, id, isSubscribed */) {
  return Promise.resolve(false);
}

export function checkSubscriptions(/* batch */) {
  return Promise.resolve(false);
}

export function isSubscribedToLeague(/* id */) {
  return Promise.resolve(false);
}

export function isSubscribedToTeam(/* id */) {
  return Promise.resolve(false);
}
