/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, View, Text, Image, Platform } from 'react-native';

const iconStyle = (width, height, backgroundHex = '000') =>
  StyleSheet.create({
    container: {
      width,
      height,
      backgroundColor: `#${backgroundHex}`,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 6,
      overflow: 'hidden',
    },
    text: {
      color: 'white',
    }
  });


export default class Icon extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      icon: null,
    };
  }

  componentWillMount() {
    this.updateState(this.props);
  }

  componentDidMount() {
    this._ismounted = true;
  }

  componentWillUnmount() {
    this._ismounted = false;
  }

  getPlaceHolder(width, height, backgroundColor) {
    const style = iconStyle(width, height, backgroundColor);
    return Promise.resolve(
      <View style={style.container} />
    );
  }

  getDefaultIcon(width, height, backgroundColor, text) {
    const style = iconStyle(width, height, backgroundColor);
    return Promise.resolve(
      <View
        style={style.container}
        accessible={false}
        accessibilityLabel="default-icon"
      >
        <Text style={style.text}>{text}</Text>
      </View>
    );
  }

  getLogo(width, height, backgroundColor, url) {
    // png images (ios and android) have padding by default
    const { iconWidth, iconHeight } = Platform.select({
      default: {
        iconWidth: width,
        iconHeight: height,
      },
      web: {
        iconWidth: width * 0.75,
        iconHeight: height * 0.75,
      },
    });
    const style = iconStyle(width, height, backgroundColor);
    return Image.prefetch(url)
      .then(() => (
        <View
          accessible={false}
          accessibilityLabel="generic-logo"
          style={style.container}
        >
          <Image
            resizeMode="contain"
            style={{
              width: iconWidth,
              height: iconHeight,
            }}
            source={{ uri: url }}
          />
        </View>
      ));
  }

  getPngUrl(url) {
    return url
      .replace('logos', 'pngs')
      .replace('.svg', '_192.png');
  }

  isLatestIcon(url, logoDetails) {
    if (this.props.logoDetails) {
      return this.props.logoDetails.style === logoDetails.style;
    }
    return this.props.url === url;
  }

  updateIcon = (icon) => {
    if (!this._ismounted) {
      return;
    }
    this.setState({
      icon,
    });
  }

  updateState(props) {
    const url = props.url;
    const width = props.width || 50;
    const height = props.height || 50;
    if (!props.logoDetails) {
      return;
    }
    const backgroundColor = props.logoDetails.backgroundColor;

    if (props.logoDetails.backgroundImage) {
      // slice url
      // input: url(xxxx), output: xxxx
      let iconUrl = props.logoDetails.backgroundImage.slice(4, -1);
      if (Platform.OS !== 'web') {
        iconUrl = this.getPngUrl(iconUrl);
      }

      this.getPlaceHolder(width, height, backgroundColor)
        .then(this.updateIcon);

      this.getLogo(width, height, backgroundColor, iconUrl)
        .then(icon => this.isLatestIcon(url, props.logoDetails) && this.updateIcon(icon));
    } else if (props.logoDetails.backgroundColor) {
      const text = props.logoDetails.text;
      this.getDefaultIcon(width, height, backgroundColor, text)
        .then(this.updateIcon);
    }
  }

  render() {
    return this.state.icon;
  }
}
