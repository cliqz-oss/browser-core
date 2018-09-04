import React from 'react';
import { StyleSheet } from 'react-native';

import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';

const styles = StyleSheet.create({
  rating: {
    height: 20,
    width: 120,
    marginTop: 5,
    marginBottom: 5,
  },
});

export default function ({ image }) {
  const imageUrl = image;
  if (!imageUrl) {
    return null;
  }
  const imageName = normalizeUrl(imageUrl);
  return (
    <NativeDrawable
      style={styles.rating}
      source={imageName}
    />
  );
}

