import React from 'react';
import events from '../../core/events';
import { setDefaultSearchEngine } from '../../core/search-engines';
import prefs from '../../core/prefs';
import { addConnectionChangeListener, removeConnectionChangeListener } from '../../platform/network';
import SearchUI from '../SearchUI';
import Cliqz from './cliqz';
import { Provider as CliqzProvider } from '../cliqz';

export default class MobileCards extends React.Component {
  constructor(props) {
    super(props);
    this.cliqz = new Cliqz();
    this.isDeveloper = prefs.get('developer', false);
    this.appStart = props.appStart || Promise.resolve();

    events.sub('search:results', this.updateResults);
    events.sub('mobile-browser:notify-preferences', this.updatePreferences);
    events.sub('mobile-browser:set-search-engine', this.setSearchEngine);
    addConnectionChangeListener();
  }

  state = {
    results: {
      results: [],
      meta: {}
    },
    theme: 'light'
  }

  componentWillUnmount() {
    events.un_sub('mobile-browser:notify-preferences', this.updatePreferences);
    events.un_sub('mobile-browser:set-search-engine', this.setSearchEngine);
    events.un_sub('search:results', this.updateResults);
    removeConnectionChangeListener();
  }

  setSearchEngine = (engine) => {
    setDefaultSearchEngine(engine);
  }

  _setTheme(incognito) {
    const theme = incognito ? 'dark' : 'light';
    this.setState({ theme });
  }

  updatePreferences = (_prefs) => {
    // clear cache with every visit to tab overiew and settings
    this.appStart.then(() => {
      Object.keys(_prefs).forEach((key) => {
        prefs.set(key, _prefs[key]);
        if ((key === 'incognito')) {
          this._setTheme(_prefs[key]);
        }
      });
    });
  }

  updateResults = results => this.setState({ results });

  render() {
    const results = this.state.results.results || [];
    const meta = this.state.results.meta || {};
    const theme = this.state.theme;
    if (!results.length) {
      return null;
    }
    return (
      <CliqzProvider value={this.cliqz}>
        <SearchUI results={results} meta={meta} theme={theme} />
      </CliqzProvider>
    );
  }
}
