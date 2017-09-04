import React from 'react';
import { StyleSheet } from 'react-native';
import ImageQueue from '../../components/ImageQueue';

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
    console.log(url);
    return <ImageQueue source={{uri: url}} style={{height: 200}} resizeMode="cover"/>;
  }
}