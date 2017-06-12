import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import utils from '../modules/core/utils';

import { width, height, cardWidth } from '../styles/CardStyle';
import Generic from './Generic';

class Card extends React.Component {

  render() {
    const result = this.props.result;
    return (
      <View style={styles.container}>
        <Generic result={result} />
      </View>
    )
  }
}

var styles = StyleSheet.create({
    container: {
      backgroundColor: '#FFFFFF',
    },
  });

export default Card;
