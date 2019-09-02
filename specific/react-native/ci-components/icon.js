/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import ImageButton from './image-button';

import logos from '../modules/core/services/logos';

// to be cleaned

class Icon extends React.Component {

  render() {
    const url = this.props.url;
    const baseUrl = this.props.baseUrl;
    let logoDetails = this.props.logoDetails;
    const width = this.props.width || 50;
    const height = this.props.height || 50;
    const borderRadius = this.props.borderRadius || 8;
    if (url) {
      logoDetails = logos.getLogoDetails(url);
    }

    if (logoDetails.backgroundImage) {
      const iconUrl = logoDetails.backgroundImage
                      .replace('url(', '')
                      .replace('logos', 'pngs')
                      .replace(/\$.*/, '$_192.png');
      var image = {uri: iconUrl};
      const actions = this.props.actions;
      return (
          <ImageButton
            style={{width:width,height:height,borderRadius: borderRadius}}
            size={width}
            appearance={{normal: image, highlight: image}}
            onPress={() =>
              {
                actions.openUrl(baseUrl);
              }
            }
          />
      )
    } else {
      const text = logoDetails.text;
      const background = logoDetails.backgroundColor;
      const textColor = logoDetails.color;
      const style = defaultIconStyle(textColor, background, width, height);
      return (
        <View style={style.containter} >
          <Text style={style.text}>{text}</Text>
        </View>
      )
    }
  }
}

const defaultIconStyle = function (textColor, backgroundColor, width, height) {
  backgroundColor = `#${backgroundColor}`;
  return StyleSheet.create({
    containter: {
      width,
      height,
      backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
    },
    text: {
      color: textColor,
    }
  });

}

export default Icon;
