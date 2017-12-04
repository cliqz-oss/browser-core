import { Image } from 'react-native';
export default Image;

export function normalizeUrl(url) {
  if (url.startsWith('http')) {
    return url; // over the network
  }
  return './img/' + url; // local image
};
