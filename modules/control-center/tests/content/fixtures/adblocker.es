/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const dataOn = {
  activeURL: 'http://www.spiegel.de/',
  friendlyURL: 'http://www.spiegel.de/',
  isSpecialUrl: false,
  domain: 'spiegel.de',
  extraUrl: '',
  hostname: 'www.spiegel.de',
  module: {
    antitracking: {
      visible: false,
    },
    adblocker: {
      visible: true,
      enabled: true,
      optimized: false,
      disabledForDomain: false,
      disabledEverywhere: false,
      totalCount: 12,
      advertisersList: {},
      state: 'active',
      off_state: 'off_domain'
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
  amo: false,
  compactView: false
};

export const dataOffSite = {
  activeURL: 'http://www.spiegel.de/',
  friendlyURL: 'http://www.spiegel.de/',
  isSpecialUrl: false,
  domain: 'spiegel.de',
  extraUrl: '',
  hostname: 'www.spiegel.de',
  module: {
    antitracking: {
      visible: false,
    },
    adblocker: {
      visible: true,
      enabled: false,
      optimized: false,
      disabledForDomain: true,
      disabledEverywhere: false,
      totalCount: 12,
      advertisersList: {},
      state: 'off',
      off_state: 'off_domain'
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
  amo: false,
  showPoweredBy: true,
  compactView: false
};

export const dataOffAll = {
  activeURL: 'http://www.spiegel.de/',
  friendlyURL: 'http://www.spiegel.de/',
  isSpecialUrl: false,
  domain: 'spiegel.de',
  extraUrl: '',
  hostname: 'www.spiegel.de',
  module: {
    antitracking: {
      visible: false,
    },
    adblocker: {
      visible: true,
      enabled: false,
      optimized: false,
      disabledForDomain: false,
      disabledEverywhere: true,
      totalCount: 12,
      advertisersList: {},
      state: 'off',
      off_state: 'off_all'
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
  amo: false,
  compactView: false,
  showPoweredBy: true,
};
