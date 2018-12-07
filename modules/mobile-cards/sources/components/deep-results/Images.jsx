import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { getCardWidth } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const MAX_IMAGE_COUNT = 3;

const styles = theme => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: themeDetails[theme].images.backgroundColor,
    paddingTop: 5,
    paddingBottom: 5,
  },
});

export default class Images extends React.Component {
  displayImage(data, index, { length }) {
    const width = getCardWidth() / MAX_IMAGE_COUNT;
    const resizeMode = length > 1 ? 'cover' : 'contain';
    return (
      <Image
        key={data.image + index}
        source={{ uri: data.image }}
        style={{ height: 100, width }}
        resizeMode={resizeMode}
      />
    );
  }

  render() {
    const theme = this.props.theme;
    const imageList = (this.props.data || [])
      .filter(data => !data.image.endsWith('.svg'))
      .slice(0, MAX_IMAGE_COUNT)
      .map(this.displayImage);
    return (
      <View style={styles(theme).container}>
        { imageList }
      </View>
    );
  }
}
