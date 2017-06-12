import React from 'react';
import { StyleSheet, View, Text, Dimensions, ViewPagerAndroid } from 'react-native';
import Card from './Card';
import { widthPercentage, cardsGap } from '../styles/CardStyle';

class CardList extends React.Component {

  render() {
    const result = this.props.result;
    console.log('props', this.props);
    if (!result) return null;
    const cards = result._results.map(
      (result, index) => <Card style={styles.card} key={index} result={result} />
    );
    return (
      <ViewPagerAndroid
          style={styles.container}
          initialPage={0}
          ref={viewPager => { this.viewPager = viewPager; }}
      >
        { cards }
      </ViewPagerAndroid>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  card: {
  }
});


export default CardList;
