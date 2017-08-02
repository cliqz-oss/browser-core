import React from 'react';
import { StyleSheet, View } from 'react-native';
import startup from './modules/platform/startup';
import inject from './modules/core/kord/inject';
import events from './modules/core/events';
import nativeBridge from './modules/platform/native-bridge';
import utils from './modules/core/utils';
import Search from './modules/autocomplete/search';
import CardList from './components/CardList';

const appStart = startup.then(() => {
  nativeBridge.registerAction('getLogoDetails', (url) => utils.getLogoDetails(utils.getDetailsFromUrl(url)));
});

const styles = function (isIncognito) {
  const backgroundColor = isIncognito ? '#333333' : '#E8E8E8';
  return StyleSheet.create({
    container: {
      backgroundColor,
      flex: 1,
      flexDirection: 'column',
    },
  });
};

let lastSearch = '';

export default class SearchUI extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      result: null,
    }
  }

  updatePreferences(prefs) {
    // clear cache with every visit to tab overiew and settings
    this.autocomplete.action('clearResultCache');
    for (var key in prefs) {
      if (prefs.hasOwnProperty(key)) {
        utils.setPref(key, prefs[key]);
      }
    }
    this.setState({'incognito': Boolean(prefs.incognito)});
  }

  setSearchEngine(engine, url) {
    if (url) { // temporary until iOS complies
      engine = { engine, url };
    }
    utils.setDefaultSearchEngine(engine);
    this.setState({engine});
  }

  componentDidMount() {
    appStart.then(() => {
      this.autocomplete = inject.module('autocomplete');
      
      // TODO: use constants from native instead of magic event names
      events.sub('search', this.searchResults.bind(this));
      events.sub('mobile-browser:notify-preferences', this.updatePreferences.bind(this));
      events.sub('mobile-browser:set-search-engine', this.setSearchEngine.bind(this));
    });
  }

  searchResults(query) {
    lastSearch = query;
    const searchStartTime = Date.now();
    this.autocomplete.action('search', query, (result) => {
      if (lastSearch !== query) {
        return;
      }
      this.setState({ result });
    }).then(console.log.bind(console)).catch((err) => {
      console.error(err);
    });
  }

  render() {
    return (
      <View style={styles(this.state.incognito).container}>
        <CardList result={this.state.result} />
      </View>
    );
  }

  componentWillUnmount() {
    events.un_sub('search', this.searchResults);
    events.un_sub('mobile-browser:notify-preferences', this.updatePreferences);
    events.un_sub('mobile-browser:set-search-engine', this.setSearchEngine);
  }
}
