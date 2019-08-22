/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [
  {
    url: 'https://countrycode.org/germany',
    trigger_method: 'url',
    snippet: {
      friendlyUrl: 'countrycode.org/germany',
      extra: {
        country_name: 'Germany',
        dialing_prefix: 49,
        flag_uri: 'https://cdn.cliqz.com/extension/countries/flags/svg/de.svg',
        country_code: 'DE'
      }
    },
    subType: {
      id: '-3481798505982424047',
      name: 'countrycode',
      class: 'EntityDialingCode'
    },
    trigger: [],
    template: 'dialing-code',
    type: 'rh'
  },
];
