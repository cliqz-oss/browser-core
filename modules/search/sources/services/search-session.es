/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import random from '../../core/helpers/random';

/**
 * NOTE: this is in some aspects a code smell. This logic used to live in cliqz
 * utils and from the usage pattern has been made a service since it seemed to
 * correspond best at the time. On the other hand, we should probably not use
 * this as a global store for properties related somehow to search and a better
 * design should be implemented (e.g.: it seems weird that queryLastDraw should
 * be stored here as it's a property of the space where results are rendered).
 */
export default function service() {
  let searchSession = '';

  return {
    setSearchSession() {
      const rand = random(32);
      searchSession = rand;
    },
    encodeSessionParams() {
      if (searchSession.length) {
        return `&s=${encodeURIComponent(searchSession)}`;
      }
      return '';
    },
  };
}
