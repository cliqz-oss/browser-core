/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getCardWidth } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  url: {
    color: themeDetails[theme].card.headerTxtColor,
    width: getCardWidth() - 95, // width of icon + margins
    fontSize: 11,
    lineHeight: 13,
    fontWeight: 'bold',
  },
  container: {
    maxHeight: 13,
    overflow: 'hidden',
  }
});

export default function (props) {
  const url = props.url;
  const theme = props.theme;
  if (!url || url === 'n/a' || url === 'undefined') {
    return null;
  }
  return (
    <View style={styles(theme).container}>
      <Text
        accessible={false}
        accessibilityLabel="generic-link"
        numberOfLines={1}
        style={styles(theme).url}
      >
        {url}
      </Text>
    </View>
  );
}
