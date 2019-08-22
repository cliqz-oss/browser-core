/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const style = theme => StyleSheet.create({
  description: {
    ...elementSideMargins,
    ...elementTopMargin,
    color: themeDetails[theme].textColor,
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 19,
  }
});

export default function (props) {
  return (
    <Text
      accessible={false}
      accessibilityLabel="generic-desc"
      numberOfLines={10}
      style={style(props.theme).description}
    >
      {props.description}
    </Text>
  );
}
