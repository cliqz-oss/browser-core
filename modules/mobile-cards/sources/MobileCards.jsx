import React from 'react';
import SearchUI from './SearchUI';
import Cliqz from './cliqz-android/cliqz';
import { Provider as CliqzProvider } from './cliqz';

export default class MobileCards extends React.Component {
  constructor() {
    super();
    this.cliqz = new Cliqz(this.actions);
    this.init();
  }

  state = {
    results: '[]',
    theme: 'light'
  }

  actions = {
    renderResults: results => this.setState({ results }),
    changeTheme: theme => this.setState({ theme, results: '[]' })
  }

  async init() {
    await this.cliqz.init();
    const config = await this.cliqz.mobileCards.getConfig();
    document.title = config.tabId;
  }

  render() {
    const results = JSON.parse(this.state.results);
    const theme = this.state.theme;
    if (!results.length) {
      return null;
    }
    /* eslint-disable */
    return (
      <CliqzProvider value={this.cliqz}>
        <SearchUI results={results} theme={theme} />
      </CliqzProvider>
    );
    /* eslint-enable */
  }

  componentDidMount() {
    this.cliqz.mobileCards.sendUIReadySignal();
  }
}
