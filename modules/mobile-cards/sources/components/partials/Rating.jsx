/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';

const styles = StyleSheet.create({
  rating: {
    height: 15,
    width: 90,
    marginTop: 5,
    marginBottom: 5,
  },
});

export default function ({ image }) {
  const imageUrl = image;
  if (!imageUrl) {
    return null;
  }
  const imageName = normalizeUrl(imageUrl);
  return (
    <View
      accessible={false}
      accessibilityLabel="rating"
    >
      <NativeDrawable
        style={styles.rating}
        source={imageName}
      />
    </View>
  );
}
