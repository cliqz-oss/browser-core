/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function generateDataFalse() {
  return {
    activeURL: 'http://www.spiegel.de/',
    friendlyURL: 'http://www.spiegel.de/',
    isSpecialUrl: false,
    domain: 'spiegel.de',
    extraUrl: '',
    hostname: 'www.spiegel.de',
    module: {
      antitracking: {
        visible: true,
        strict: false,
        hostname: 'www.spiegel.de',
        cookiesCount: 54,
        requestsCount: 0,
        totalCount: 54,
        badgeData: 54,
        enabled: true,
        isWhitelisted: true,
        reload: false,
        ps: null,
        state: 'active'
      },
    },
    generalState: 'active',
    feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
    locationSharingURL: 'https://cliqz.com/support/local-results',
    myoffrzURL: 'https://cliqz.com/myoffrz',
    reportSiteURL: 'https://cliqz.com/report-url',
    amo: false,
    showPoweredBy: true,
    compactView: false,
  };
}

export function generateDataTrue() {
  return {
    activeURL: 'http://www.spiegel.de/',
    friendlyURL: 'http://www.spiegel.de/',
    isSpecialUrl: true,
    domain: 'spiegel.de',
    extraUrl: '',
    hostname: 'www.spiegel.de',
    module: {
      antitracking: {
        visible: true,
        strict: false,
        hostname: 'www.spiegel.de',
        cookiesCount: 54,
        requestsCount: 0,
        totalCount: 54,
        badgeData: 54,
        enabled: true,
        isWhitelisted: true,
        reload: false,
        ps: null,
        state: 'active'
      },
    },
    generalState: 'active',
    feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
    locationSharingURL: 'https://cliqz.com/support/local-results',
    myoffrzURL: 'https://cliqz.com/myoffrz',
    reportSiteURL: 'https://cliqz.com/report-url',
    amo: false,
    showPoweredBy: true,
    compactView: false,
  };
}
