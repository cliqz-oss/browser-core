import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { getCardWidth } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  container: {
    backgroundColor: themeDetails[theme].images.backgroundColor,
    paddingTop: 5,
    paddingBottom: 5,
    borderBottomWidth: themeDetails[theme].images.border,
    borderBottomColor: themeDetails[theme].separatorColor,
  }
});

export default ({ extra = {}, theme }) => {
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
    <View
      accessible={false}
      accessibilityLabel="main-image"
      style={styles(theme).container}
    >
      <Image
        source={{ uri: url }}
        style={{ width: getCardWidth(), height: 100 }}
        resizeMode="contain"
      />
    </View>
  );
};
