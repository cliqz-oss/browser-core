/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { Image } from 'react-native';

export default function (props) {
  return <Image {...props} source={{ uri: props.source }} />;
}

export function normalizeUrl(url) {
  if (url.startsWith('http')) {
    return url; // over the network
  }
  return `./img/${url}`; // local image
}
