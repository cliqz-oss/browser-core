import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';

import utils from '../../../core/utils';


export default class extends React.Component {

  render() {
    const url = this.props.url;
    const width = this.props.width || 50;
    const height = this.props.height || 50;
    const urlDetails = utils.getDetailsFromUrl(url);
    const logoDetails = this.props.logoDetails || utils.getLogoDetails(urlDetails);
    if (!logoDetails) {
      return null;
    }

    if (logoDetails.backgroundImage) {
      const iconUrl = logoDetails.backgroundImage
                      .replace('url(', '')
                      .replace('logos', 'pngs')
                      .replace(/\$.*/, '$_192.png');
      return (
          <Image
            style={{width, height}}
            source={{uri: iconUrl}}
          />
      )
    } else if (logoDetails.backgroundColor) {
      const text = logoDetails.text;
      const background = logoDetails.backgroundColor;
      const textColor = logoDetails.color;
      const style = defaultIconStyle(textColor, background, width, height);
      return (
        <View style={style.containter} >
          <Text style={style.text}>{text}</Text>
        </View>
      )
    } else {
      return null;
    }
  }
}

const defaultIconStyle = function (textColor, backgroundHex = '000', width, height) {
  return StyleSheet.create({
    containter: {
      width,
      height,
      backgroundColor: `#${backgroundHex}`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      color: textColor,
    }
  });
}
