/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';

import { width, height, cardWidth } from '../styles/CardStyle';
import Generic from './generic';

export default class extends React.Component {

  render() {
    const result = this.props.result;
    return (
      <TouchableHighlight
        onPress={this.props.onPress}
      >
        <View style={styles.container}>
          <Generic result={result} />
        </View>
      </TouchableHighlight>
    )
  }
}

var styles = StyleSheet.create({
    container: {
      marginTop: 10,
      marginLeft: 10,
      marginRight:10,
      backgroundColor: '#FFFFFF',
      borderRadius: 4,
      borderColor: '#E6E6E6',
      borderWidth: 2
    },
  });
