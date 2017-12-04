import React from 'react';
import { View, StyleSheet } from 'react-native';
import ImageQueue from '../../components/ImageQueue';
import { elementTopMargin, getCardWidth } from '../../styles/CardStyle';

export default class extends React.Component {
  render() {
    const extra = this.props.extra || {};
    let url;
    if (extra.rich_data && extra.rich_data.image) {
      url = extra.rich_data.image;
    } else if (extra.media) {
      url = extra.media;
    } else if (extra.image && extra.image.src) {
      url = extra.image.src;
    } else if (extra.i) {
      url = extra.i;
    } else if (extra.og && extra.og.image) {
      url = extra.og.image;
    } else {
      return null;
    }

    return (
      <ImageQueue
        source={{uri: url}}
        style={{ width: getCardWidth(), height: 100, ...elementTopMargin }}
        landscape={true}
        resizeMode="contain"
      />
    );
  }
}
