import React from 'react';
import { StyleSheet, View } from 'react-native';
import CardList from './components/CardList';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    flex: 1,
    flexDirection: 'column',
  }
});

export default class SearchUI extends React.Component {

  filterResults(results = []) {
    return (
      results
        .filter(result => result.provider) // undefined providers (history separator)
        .filter(result => result.type !== 'navigate-to') // navigate-to
        .filter(result => !result.extra || !result.extra.is_ad) // filter offers
    );
  }

  render() {
    const results = this.props.results;
    const filteredResults = this.filterResults(results);
    if (!filteredResults.length) {
      return null;
    }
    return (
      <View
        accessible={false}
        accessibilityLabel="search-results"
        style={styles.container}
      >
        <CardList results={filteredResults} />
      </View>
    );
  }
}
