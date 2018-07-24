import React from 'react';
import { Image } from 'react-native';

export default function (props) {
  const styles = {};
  if (props.color) {
    styles.color = props.color;
  }
  return <Image {...props} styles={styles} source={{ uri: props.source }} />;
}

export function normalizeUrl(url) {
  if (url.startsWith('http')) {
    return url; // over the network
  }
  return `./img/${url}`; // local image
}
