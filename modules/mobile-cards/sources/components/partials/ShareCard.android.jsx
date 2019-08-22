/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { View } from 'react-native';

export default props => (
  <View style={[props.style || {}]}>
    { props.children }
    <View style={{ padding: 5 }} />
  </View>
);
