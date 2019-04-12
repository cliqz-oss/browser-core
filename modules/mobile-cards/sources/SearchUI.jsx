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

function isJustHistoryResult({ provider, template }) {
  return provider === 'history' && template === undefined;
}

function extractHistoryLinks(result) {
  let urls = [];
  if (result.kind.includes('H')) {
    urls.push({
      title: result.title,
      url: result.url,
      href: result.url,
    });
  }
  if (result.kind.includes('C')) {
    urls = urls.concat(result.data.urls || []);
  }
  return urls.map(url => ({
    ...url,
    logo: result.meta.logo,
  }));
}

export default class SearchUI extends React.Component {
  filterResults(results = []) {
    return (
      results
        .filter(result => result.provider) // undefined providers (history separator)
        .filter(result => result.type !== 'navigate-to') // navigate-to
        .filter(result => !result.extra || !result.extra.is_ad) // filter offers
    );
  }

  regroupHistory(results = []) {
    const historyResults = results.filter(isJustHistoryResult);
    if (historyResults.length < 3) {
      return results;
    }
    const backendResults = results.filter(result => !isJustHistoryResult(result));
    const historyCard = {
      provider: 'history',
      template: 'cluster',
      meta: {},
      data: {
        kind: ['H'],
        urls: historyResults.map(extractHistoryLinks).reduce((a, b) => a.concat(b), [])
      }
    };
    return [
      historyCard,
      ...backendResults,
    ];
  }

  render() {
    const results = this.props.results;
    const theme = this.props.theme;
    const meta = this.props.meta;
    const filteredResults = this.filterResults(results);
    // TODO: Move this whole logic to search module
    const regroupedResults = this.regroupHistory(filteredResults);
    return (
      <View
        accessible={false}
        accessibilityLabel="search-results"
        style={styles.container}
      >
        <CardList results={regroupedResults} theme={theme} meta={meta} />
      </View>
    );
  }
}
