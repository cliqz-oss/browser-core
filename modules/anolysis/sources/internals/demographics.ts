/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Demographic traits currently supported by Anolysis are the following. The
// values are created from 'core/demographics' based on multiple sources of
// information like 'channel', 'user-agent', etc.
export type DemographicTrait =
  // Specifies which product is being used. Examples:
  // - cliqz/mobile/cliqz-for-ios
  // - cliqz/add-on/cliqz-for-firefox
  | 'product'
  // Contains information about the platform used. Examples:
  // - mobile/ios/13/1
  // - desktop/windows/10
  // - desktop/linux/ubuntu/18/04
  | 'platform'
  // Information about country of user (alpha2 code). Examples:
  // - de
  // - fr
  | 'country'
  // Information about distribution which led to this installation.
  | 'campaign'
  // Install date: YYYY/MM/DD
  | 'install_date';

export type Demographics = {
  [demographic in DemographicTrait]: string;
};
