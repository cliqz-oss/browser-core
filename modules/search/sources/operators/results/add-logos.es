/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Logos from '../../../core/services/logos';

let kickerLogo = null;
function getKickerLogo() {
  if (kickerLogo) {
    return kickerLogo;
  }
  kickerLogo = Logos.getLogoDetails('https://kicker.de');
  return kickerLogo;
}

export default results => results.map(result => ({
  ...result,
  links: result.links.map(link => ({
    ...link,
    meta: {
      ...link.meta,
      logo: link.url && Logos.getLogoDetails(link.url),
      extraLogos: {},
      externalProvidersLogos: {
        kicker: getKickerLogo(),
      }
    },
  }))
}));
