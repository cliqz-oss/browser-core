/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logos from '../core/services/logos';
import { URLInfo } from '../core/url-info';

function mergePlaces(places) {
  const history = places.map((place) => {
    const details = URLInfo.get(place.url);
    const baseUrl = place.url.replace(/^(.*?:\/\/)/gi, '');

    const visit = {
      baseUrl,
      host: details.host,
      lastVisitedAt: place.visit_date,
      logo: logos.getLogoDetails(place.url),
      sessionId: place.session_id,
      title: place.title || '',
      visitId: place.id,
      url: place.url,
    };

    return visit;
  });

  return { history };
}

export default function ({ places }) {
  const history = mergePlaces(places);
  return Promise.resolve(history);
}
