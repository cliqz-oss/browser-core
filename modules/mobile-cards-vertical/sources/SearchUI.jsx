import React from 'react';
import { StyleSheet, View } from 'react-native';
import CardList from './components/CardList';
import { withStyles } from './withTheme';

const styles = (theme, themeDetails) => StyleSheet.create({
  container: {
    backgroundColor: themeDetails[theme].container.bgColor,
    flex: 1,
    flexDirection: 'column',
  }
});

const BLOCKED_TEMPLATES = ['calculator', 'currency', 'flight'];
function isResultAllowed({ template, provider, type }) {
  return (
    !BLOCKED_TEMPLATES.includes(template)
    && type !== 'navigate-to'
    && Boolean(provider)
    && provider !== 'rich-header' // promises sometimes arrive to ui
  );
}

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

class SearchUI extends React.Component {
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
    const meta = this.props.meta;
    const filteredResults = results.filter(isResultAllowed);
    if (!filteredResults.length) {
      return null;
    }
    return (
      <View
        accessible={false}
        accessibilityLabel="search-results"
        style={this.props.classes.container}
      >
        <CardList results={filteredResults} meta={meta} />
      </View>
    );
  }
}

export default withStyles(styles)(SearchUI);
