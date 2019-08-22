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
import Link from '../Link';

const styles = StyleSheet.create({
  social: {
    flex: 1,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    flexDirection: 'row',
    marginTop: 5,
  },
  image: {
    margin: 5,
    width: 20,
    height: 20,
  }
});

export default class Social extends React.Component {
  displayLink(link) {
    const imageName = normalizeUrl(link.image);
    return (
      <Link url={link.url} key={link.url}>
        <NativeDrawable
          source={imageName}
          style={styles.image}
        />
      </Link>
    );
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return (
      <View style={styles.social}>
        {this.props.data.slice(0, 3).map(this.displayLink)}
      </View>
    );
  }
}
