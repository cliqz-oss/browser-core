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
    results: [],
  }

  actions = {
    renderResults: results => this.setState({ results })
  }

  async init() {
    await this.cliqz.init();
    const config = await this.cliqz.mobileCards.getConfig();
    document.title = config.tabId;
  }

  render() {
    const results = this.state.results;
    if (!results.length) {
      return null;
    }
    /* eslint-disable */
    return (
      <CliqzProvider value={this.cliqz}>
        <SearchUI results={results} />
      </CliqzProvider>
    );
    /* eslint-enable */
  }
}
