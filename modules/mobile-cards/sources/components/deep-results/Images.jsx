import React from 'react';
import { View, StyleSheet } from 'react-native';
import ExternalImage from '../custom/ExternalImage';
import { getCardWidth, elementTopMargin } from '../../styles/CardStyle';

const MAX_IMAGE_COUNT = 3;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    ...elementTopMargin,
    justifyContent: 'center',
  },
});

export default class Images extends React.Component {
  displayImage(data, index, { length }) {
    const width = getCardWidth() / MAX_IMAGE_COUNT;
    const resizeMode = length > 1 ? 'cover' : 'contain';
    return (
      <ExternalImage
        key={index}
        source={{ uri: data.image }}
        style={{ height: 100, width }}
        resizeMode={resizeMode}
      />
    );
  }

  render() {
    const imageList = (this.props.data || [])
      .filter(data => !data.image.endsWith('.svg'))
      .slice(0, MAX_IMAGE_COUNT)
      .map(this.displayImage);
    return (
      <View style={styles.container}>
        { imageList }
      </View>
    );
  }
}
