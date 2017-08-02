import React from 'react';
import { StyleSheet, View, Text, Dimensions, ScrollView } from 'react-native';
import Card from './Card';
import SearchEngineCard from './SearchEngineCard';
import { cardsGap, cardWidth, vpWidth, vpHeight } from '../styles/CardStyle';

class CardList extends React.Component {


  componentWillUpdate() {
    if (this.scrollView) {
      setTimeout(() => this.scrollView.scrollTo({ x: 0, y: 0 }) , 0);
    }
  }

  render() {
    const result = this.props.result;
    console.log('props', this.props);
    if (!result) return null;
    const cards = result._results.map(
      (result, index) => <Card style={styles.card} key={index} result={result} />
    );
    // Horizontal Scroll view or ViewPagerAndroid
    // nested horizontal scrolling is not supported in Android
    return (
      <ScrollView
        style={styles.container}
        ref={scrollView => { this.scrollView = scrollView; }}
        horizontal={true}
        pagingEnabled={true}
        bounces={false}
      >
        { cards }
        <SearchEngineCard query={result._searchString} key={result.length}/>
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // width: cardWidth + cardsGap,
    // marginLeft: cardsGap * 1.5,
  },
  card: {
  },
  google: {
    width: vpWidth, // to be replaced with cardWidth
    height: vpHeight,
  }
});


export default CardList;
