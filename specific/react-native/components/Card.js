import React from 'react';
import { StyleSheet, ScrollView, Text } from 'react-native';
import utils from '../modules/core/utils';

import { cardWidth, cardsGap, vpWidth } from '../styles/CardStyle';
import Generic from './Generic';
import Link from './Link';

class Card extends React.Component {

  render() {
    const result = this.props.result;
    // link doesn't propagate from child views
    return (
      <Link to={result.val} openLink={this.props.openLink}>
        <ScrollView style={styles.container} keyboardDismissMode='on-drag'>
          <Generic result={result} />
        </ScrollView>
      </Link>
    )
  }
}

var styles = StyleSheet.create({
    container: {
      backgroundColor: '#FFFFFF',
      paddingLeft: 10,
      paddingRight: 10,
      width: vpWidth,
      // marginRight: cardsGap,
    },
  });

export default Card;
