import React from 'react';
import { StyleSheet, View, Text, Image, Platform } from 'react-native';

const defaultIconStyle =
  (width, height, backgroundHex = '000') =>
    StyleSheet.create({
      containter: {
        width,
        height,
        backgroundColor: `#${backgroundHex}`,
        justifyContent: 'center',
        alignItems: 'center',
      },
      text: {
        color: 'white',
      }
    });


export default class Icon extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      icon: null,
    };
    this.updateState(props);
  }

  getPlaceHolder(width, height, backgroundColor) {
    const style = defaultIconStyle(width, height, backgroundColor);
    return Promise.resolve(
      <View style={style.containter} />);
  }

  getDefaultIcon(width, height, backgroundColor, text) {
    const style = defaultIconStyle(width, height, backgroundColor);
    return Promise.resolve(
      <View
        style={style.containter}
        accessible={false}
        accessibilityLabel={'default-icon'}
      >
        <Text style={style.text}>{text}</Text>
      </View>
    );
  }

  getLogo(width, height, url) {
    // png images (ios and android) have padding by default
    const { iconWidth, iconHeight } = Platform.select({
      default: {
        iconWidth: width,
        iconHeight: height,
      },
      web: {
        iconWidth: width * 0.85,
        iconHeight: height * 0.85,
      },
    });
    return Image.prefetch(url)
      .then(() => (
        <View
          accessible={false}
          accessibilityLabel={'generic-logo'}
          style={{
            width,
            height,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Image
            resizeMode="contain"
            style={{
              width: iconWidth,
              height: iconHeight,
              backgroundColor: 'transparent'
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
        .then(icon => this.setState({ icon }));

      this.getLogo(width, height, iconUrl)
        .then(icon => this.isLatestIcon(url, props.logoDetails) && this.setState({ icon }));
    } else if (props.logoDetails.backgroundColor) {
      const text = props.logoDetails.text;
      this.getDefaultIcon(width, height, backgroundColor, text)
        .then(icon => this.setState({ icon }));
    }
  }

  render() {
    return this.state.icon;
  }
}
