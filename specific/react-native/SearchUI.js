import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
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
    wheel: {
      position: 'absolute',
      zIndex: 1,
      alignSelf: 'flex-end'
    }
  });
};

let lastSearch = '';

export default class SearchUI extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      result: null,
      isFetching: false,
    }
    this.autocomplete = inject.module('autocomplete');
    // TODO: use constants from native instead of magic event names
    events.sub('search', this.searchResults.bind(this));
    events.sub('mobile-browser:notify-preferences', this.updatePreferences.bind(this));
    events.sub('mobile-browser:set-search-engine', this.setSearchEngine.bind(this));
  }

  updatePreferences(prefs) {
    // clear cache with every visit to tab overiew and settings
    appStart.then(() => {
      this.autocomplete.action('clearResultCache');
      for (var key in prefs) {
        if (prefs.hasOwnProperty(key)) {
          utils.setPref(key, prefs[key]);
        }
      }
      this.setState({'incognito': Boolean(prefs.incognito)});
    });
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
      this._isAppLoaded = true
      if (this._deferredSearchParams) {
        this.searchResults(...this._deferredSearchParams);
      }
    });
  }

  searchResults(query, locationEnabled, lat, lon) {
    if (!this._isAppLoaded) {
      this._deferredSearchParams = arguments;
      return;
    }
    if (locationEnabled) {
      if (!utils.USER_LAT) {
        // clear cache if location was just enabled
        this.autocomplete.action('clearResultCache');
      }
      utils.USER_LAT = lat;
      utils.USER_LNG = lon;
    } else {
      if (utils.USER_LAT) {
        // clear cache if location was just disabled
        this.autocomplete.action('clearResultCache');
      }
      delete utils.USER_LAT;
      delete utils.USER_LNG;
    }
    lastSearch = query;
    this.setState({ isFetching: true });
    this.autocomplete.action('search', query, (result) => {
      if (lastSearch !== query) {
        return;
      }
      this.setState({ result, isFetching: false });
    }).catch((err) => {
      console.error(err);
    });
  }

  render() {
    return (
      <View style={styles(this.state.incognito).container}>
        { this.state.isFetching &&
          <ActivityIndicator style={styles().wheel} size='large' color='#00AEF0' />
        }
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
