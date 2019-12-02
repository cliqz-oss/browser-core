/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const AUTOCONSENT_INITIAL = {
  activeURL: 'https://cliqz.com/',
  friendlyURL: 'https://cliqz.com/',
  isSpecialUrl: false,
  domain: 'cliqz.com',
  extraUrl: '',
  hostname: 'cliqz.com',
  module: {
    autoconsent: {
      visible: true,
      enabled: false,
      isWhitelisted: false,
      defaultDeny: false,
      defaultAllow: false,
      state: 'critical',
      status: null
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.40.0-40',
  compactView: false,
  privacyPolicyURL: 'http://cliqz.com/privacy-browser',
  showPoweredBy: true,
  showLearnMore: true,
};

export const AUTOCONSENT_ENABLED = {
  activeURL: 'https://sourceforge.net/',
  friendlyURL: 'https://sourceforge.net/',
  isSpecialUrl: false,
  domain: 'sourceforge.net',
  extraUrl: '',
  hostname: 'sourceforge.net',
  module: {
    autoconsent: {
      visible: true,
      enabled: true,
      isWhitelisted: true,
      state: 'active',
      defaultDeny: true,
      defaultAllow: false,
      cmp: 'quantcast',
      status: null,
      setting: 'deny',
      defaultSetting: 'deny'
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.40.0-40',
  compactView: false,
  privacyPolicyURL: 'http://cliqz.com/privacy-browser',
  showPoweredBy: true,
  showLearnMore: true,
};

export const AUTOCONSENT_DEFAULT_ALLOW = {
  activeURL: 'https://sourceforge.net/',
  friendlyURL: 'https://sourceforge.net/',
  isSpecialUrl: false,
  domain: 'sourceforge.net',
  extraUrl: '',
  hostname: 'sourceforge.net',
  module: {
    autoconsent: {
      visible: true,
      enabled: true,
      isWhitelisted: true,
      state: 'active',
      defaultDeny: false,
      defaultAllow: true,
      cmp: 'quantcast',
      status: null,
      setting: 'allow',
      defaultSetting: 'allow'
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.40.0-40',
  compactView: false,
  privacyPolicyURL: 'http://cliqz.com/privacy-browser',
  showPoweredBy: true,
  showLearnMore: true,
};


export const AUTOCONSENT_SITE_WHITELISTED = {
  activeURL: 'https://sourceforge.net/',
  friendlyURL: 'https://sourceforge.net/',
  isSpecialUrl: false,
  domain: 'sourceforge.net',
  extraUrl: '',
  hostname: 'sourceforge.net',
  module: {
    autoconsent: {
      visible: true,
      enabled: false,
      isWhitelisted: true,
      state: 'inactive',
      defaultDeny: true,
      defaultAllow: false,
      cmp: 'quantcast',
      status: null,
      setting: 'none',
      defaultSetting: 'deny'
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.40.0-40',
  compactView: false,
  privacyPolicyURL: 'http://cliqz.com/privacy-browser',
  showPoweredBy: true,
  showLearnMore: true,
};

export const AUTOCONSENT_DISABLED = {
  activeURL: 'https://sourceforge.net/',
  friendlyURL: 'https://sourceforge.net/',
  isSpecialUrl: false,
  domain: 'sourceforge.net',
  extraUrl: '',
  hostname: 'sourceforge.net',
  module: {
    autoconsent: {
      visible: true,
      enabled: false,
      state: 'critical',
    },
  },
  generalState: 'active',
  feedbackURL: 'https://cliqz.com/feedback/1.40.0-40',
  compactView: false,
  privacyPolicyURL: 'http://cliqz.com/privacy-browser',
  showPoweredBy: true,
  showLearnMore: true,
};
