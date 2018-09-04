import React from 'react';
import { Image } from 'react-native';

export default function (props) {
  return <Image {...props} source={{ uri: props.source }} />;
}

export function normalizeUrl(url) {
  if (url.startsWith('http')) {
    return url; // over the network
  }
  return `./img/${url}`; // local image
}
