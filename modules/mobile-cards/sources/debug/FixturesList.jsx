import React from 'react';
import { Text, ScrollView, StyleSheet, View } from 'react-native';
import SearchUI from '../SearchUI';
import fixtures from './fixtures/index';

const styles = StyleSheet.create({
  background: {
    backgroundColor: 'gray',
    height: '100%',
  },
  wrapper: {
    width: 300,
    height: 400,
    margin: 20,
  },
  search: {
  },
  query: {
    margin: 3,
  }
});

function Search({ result }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.query}>
        {`Query: ${result._searchString}`}
      </Text>
      <SearchUI
        result={result}
        style={styles.search}
      />
    </View>
  );
}

export default function () {
  return (
    <ScrollView style={styles.background}>
      {fixtures.map(result =>
        <Search result={result} />)}
    </ScrollView>
  );
}
