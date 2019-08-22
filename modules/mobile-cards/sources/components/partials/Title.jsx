/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const style = (theme, color) => StyleSheet.create({
  container: {
    ...elementSideMargins,
    ...elementTopMargin,
  },
  title: {
    color,
    fontWeight: 'bold',
    fontSize: 17,
  },
  meta: {
    color: '#448100',
    fontSize: 10,
  }
});

export default function (props) {
  const meta = props.meta;
  const theme = props.theme;
  const color = (theme === 'light' && props.isHistory) ? '#551A8B' : themeDetails[theme].textColor;
  return (
    <View style={style(theme, color).container}>
      <View
        accessible={false}
        accessibilityLabel="generic-title"
      >
        <Text numberOfLines={2} style={style(theme, color).title}>
          {props.title}
        </Text>
      </View>
      {!!meta
        && (
          <View
            accessible={false}
            accessibilityLabel="generic-title-meta"
          >
            <Text numberOfLines={1} style={style(theme, color).meta}>
              {meta}
            </Text>
          </View>
        )
      }
    </View>
  );
}
