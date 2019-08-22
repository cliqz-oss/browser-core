/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../../../core/kord/inject';

export default results => results.map(result => ({
  ...result,
  links: result.links.map((link) => {
    if (
      !link.extra
      || !link.extra.lat
      || !link.extra.lon
      || (
        typeof link.extra.distance === 'number'
        && link.extra.distance > -1
      )
    ) {
      return link;
    }

    let distance = -1;
    try {
      distance = inject.service('geolocation', ['distance']).distance(link.extra.lon, link.extra.lat);
    } catch (ex) {
      /* No geolocation available */
    }

    if (distance !== -1) {
      return {
        ...link,
        extra: {
          ...link.extra,
          distance: distance * 1000,
        },
      };
    }

    return link;
  }),
}));
