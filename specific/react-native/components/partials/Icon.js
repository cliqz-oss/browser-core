import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';

import utils from '../../modules/core/utils';


class Icon extends React.Component {

  render() {
    const url = this.props.url;
    const urlDetails = utils.getDetailsFromUrl(url);
    const logoDetails = utils.getLogoDetails(urlDetails);
    if (logoDetails.backgroundImage) {
      const iconUrl = logoDetails.backgroundImage
                      .replace('url(', '')
                      .replace('logos', 'pngs')
                      .replace(/\$.*/, '$_192.png');
      return (
          <Image
            style={{width: 50, height: 50}}
            source={{uri: iconUrl}}
          />
      )  
    } else {
      const text = logoDetails.text;
      const background = logoDetails.backgroundColor;
      const textColor = logoDetails.color;
      const style = defaultIconStyle(textColor, background);
      return (
        <View style={style.containter} >
          <Text style={style.text}>{text}</Text>
        </View>
      )
    }
  }
}

const defaultIconStyle = function (textColor, backgroundColor) {
  backgroundColor = `#${backgroundColor}`;
  return StyleSheet.create({
    containter: {
      width: 50,
      height: 50,
      backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      color: textColor,
    }
  });

}

export default Icon;