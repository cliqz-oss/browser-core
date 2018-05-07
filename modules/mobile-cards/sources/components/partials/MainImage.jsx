import React from 'react';
import ExternalImage from '../custom/ExternalImage';
import { elementTopMargin, getCardWidth } from '../../styles/CardStyle';


export default ({ extra = {} }) => {
  let url;
  if (extra.og && extra.og.image) {
    url = extra.og.image;
  } else if (extra.media) {
    url = extra.media;
  } else if (extra.image && extra.image.src) {
    url = extra.image.src;
  } else if (extra.i) {
    url = extra.i;
  } else if (extra.rich_data && extra.rich_data.image) {
    url = extra.rich_data.image;
  } else {
    return null;
  }

  return (
    <ExternalImage
      source={{ uri: url }}
      style={{ width: getCardWidth(), height: 100, ...elementTopMargin }}
      resizeMode="contain"
    />
  );
};
