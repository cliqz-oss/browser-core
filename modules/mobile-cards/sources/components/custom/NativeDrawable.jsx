import React from 'react';
import { Image } from 'react-native';

export default function (props) {
  const style = [props.style || {}];
  // TODO: separate react native android from webextension android
  return <Image style={style} source={{ uri: props.source }} />;
}

export function normalizeUrl(url) {
  if (/^https?:\/\//.test(url)) {
    return url; // over the network
  }
  return `./img/${url}`; // local image
}
