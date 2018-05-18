import React from 'react';
import { StyleSheet, View } from 'react-native';
import events from '../core/events';
import utils from '../core/utils';
import prefs from '../core/prefs';
import console from '../core/console';
import Search from '../search';
import CardList from './components/CardList';
import { addConnectionChangeListener, removeConnectionChangeListener } from '../platform/network';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    flex: 1,
    flexDirection: 'column',
  }
});

export default class SearchUI extends React.Component {

  constructor(props) {
    super(props);
    this.isDeveloper = prefs.get('developer', false);
    this.state = {
      results: props.results || [],
    }
    this.appStart = props.appStart || Promise.resolve();
    // TODO: use constants from native instead of magic event names
    events.sub('mobile-browser:notify-preferences', this.updatePreferences.bind(this));
    events.sub('mobile-browser:set-search-engine', this.setSearchEngine.bind(this));
    events.sub('search:results', this.renderResults.bind(this));
    addConnectionChangeListener();
  }

  updatePreferences(prefs) {
    // clear cache with every visit to tab overiew and settings
    this.appStart.then(() => {
      for (var key in prefs) {
        if (prefs.hasOwnProperty(key)) {
          utils.setPref(key, prefs[key]);
        }
      }
    });
  }

  setSearchEngine(engine, url) {
    if (url) { // temporary until iOS complies
      engine = { engine, url };
    }
    utils.setDefaultSearchEngine(engine);
    this.setState({engine});
  }

  filterResults(results = []) {
    return (
      results
        .filter(result => result.provider) // undefined providers (history separator)
        .filter(result => result.type !== 'navigate-to') // navigate-to
        .filter(result => !result.extra || !result.extra.is_ad) // filter offers
    );
  }

  renderResults({ results }) {
    this.setState({ results: this.filterResults(results) });
  }

  render() {
    if (this.state.results.length === 0) {
      return null;
    }
    return (
      <View
        accessible={false}
        accessibilityLabel="search-results"
        style={styles.container}
      >
        <CardList results={this.state.results} />
      </View>
    );
  }

  componentWillUnmount() {
    events.un_sub('mobile-browser:notify-preferences', this.updatePreferences);
    events.un_sub('mobile-browser:set-search-engine', this.setSearchEngine);
    events.un_sub('search:results', this.renderResults);
    removeConnectionChangeListener();
  }
}
