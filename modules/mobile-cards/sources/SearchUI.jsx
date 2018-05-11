import React from 'react';
import { StyleSheet, View } from 'react-native';

import inject from '../core/kord/inject';
import events from '../core/events';
import utils from '../core/utils';
import prefs from '../core/prefs';
import console from '../core/console';
import Search from '../autocomplete/search';
import CardList from './components/CardList';

const styles = function (isIncognito) {
  const backgroundColor = isIncognito ? '#4a4a4a' : '#E7ECEE';
  return StyleSheet.create({
    container: {
      backgroundColor,
      flex: 1,
      flexDirection: 'column',
    }
  });
};

let lastSearch = '';

export default class SearchUI extends React.Component {

  constructor(props) {
    super(props);
    this.isDeveloper = prefs.get('developer', false);
    if (props.query) {
      this._deferredSearchParams = [props.query];
    }
    this.state = {
      result: props.result,
    }
    this.appStart = props.appStart || Promise.resolve();
    this.autocomplete = inject.module('autocomplete');
    // TODO: use constants from native instead of magic event names
    events.sub('search', this.searchResults.bind(this));
    events.sub('mobile-browser:notify-preferences', this.updatePreferences.bind(this));
    events.sub('mobile-browser:set-search-engine', this.setSearchEngine.bind(this));
  }

  updatePreferences(prefs) {
    // clear cache with every visit to tab overiew and settings
    this.appStart.then(() => {
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
    this.appStart.then(() => {
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
    this.autocomplete.action('search', query, (result) => {
      if (lastSearch !== query) {
        return;
      }
      if (this.isDeveloper) {
        console.log('results', result);
      }
      this.setState({ result });
    }).catch((err) => {
      console.error(err);
    });
  }

  render() {
    const result = this.state.result;
    if (!result || !result._searchString) {
      return null;
    }
    return (
      <View
        accessible={false}
        accessibilityLabel="search-results"
        style={styles(this.state.incognito).container}
      >
        <CardList result={result} />
      </View>
    );
  }

  componentWillUnmount() {
    events.un_sub('search', this.searchResults);
    events.un_sub('mobile-browser:notify-preferences', this.updatePreferences);
    events.un_sub('mobile-browser:set-search-engine', this.setSearchEngine);
  }
}
