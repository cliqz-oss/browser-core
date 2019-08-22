/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    color: themeDetails[theme].textColor,
  }
});

export default class SimpleLinks extends React.Component {
  displayLink(link, theme) {
    return (
      <Link label="simple-link" url={link.url} style={styles(theme).row} key={link.url}>
        <Text style={styles(theme).text}>{link.title_locale || link.title}</Text>
      </Link>
    );
  }

  render() {
    const theme = this.props.theme;
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return (
      <View>
        {this.props.data.slice(0, 3).map(link => this.displayLink(link, theme))}
      </View>
    );
  }
}
