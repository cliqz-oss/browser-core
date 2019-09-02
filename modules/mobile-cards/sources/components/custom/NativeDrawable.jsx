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
  const style = [props.style || {}];
  // TODO: separate react native android from webextension android
  return <Image style={style} source={{ uri: props.source }} />;
}

export function normalizeUrl(url) {
  if (/^https?:\/\//.test(url)) {
    return url; // over the network
  }
  return `./img/${url}`; // local image
}
