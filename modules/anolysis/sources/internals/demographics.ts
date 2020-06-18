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
  // Information about country of user (alpha2 code). Examples:
  // - de
  // - fr
  | 'country'
  // Information about distribution which led to this installation.
  | 'campaign'
  // Install date: YYYY/MM/DD
  | 'install_date'
  | 'extension'
  | 'browser'
  | 'os';

export type Demographics = {
  [demographic in DemographicTrait]: string;
};
