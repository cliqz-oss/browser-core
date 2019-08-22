/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getMessage } from '../../../core/i18n';
import Link from '../Link';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  row: {
    ...elementTopMargin,
    borderTopWidth: 1.5,
    borderTopColor: themeDetails[theme].separatorColor,
    paddingTop: 10,
  },
  text: {
    fontSize: 16,
    ...elementSideMargins,
    color: 'white',
  }
});

export default class Download extends React.Component {
  displayLink(link) {
    const theme = this.props.theme;
    return (
      <Link url={link.url} style={styles.row} key={link.url}>
        <Text style={styles(theme).text}>{ getMessage(link.extra.domain) }</Text>
      </Link>
    );
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return (
      <View>
        {this.props.data.slice(0, 3).map(this.displayLink)}
      </View>
    );
  }
}
