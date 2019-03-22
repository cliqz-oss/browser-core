import React from 'react';
import SearchUI from './SearchUI';
import Cliqz from './cliqz-android/cliqz';
import { Provider as CliqzProvider } from './cliqz';

function metaInfo(resp) {
  const response = JSON.parse(resp);

  return {
    ...response.meta,
    query: response.query
  };
}

export default class MobileCards extends React.Component {
  constructor() {
    super();
    this.cliqz = new Cliqz(this.actions);
    this.init();
  }

  state = {
    results: [],
    theme: 'light'
  }

  actions = {
    renderResults: (response) => {
      this.setState({
        results: JSON.parse(response).results,
        meta: metaInfo(response),
      });
    },
    changeTheme: theme => this.setState({ theme, results: [] })
  }

  async init() {
    await this.cliqz.init();
    const config = await this.cliqz.mobileCards.getConfig();
    document.title = config.tabId;
  }

  render() {
    const results = this.state.results;
    const theme = this.state.theme;
    const meta = this.state.meta;
    if (!results.length) {
      return null;
    }
    /* eslint-disable */
    return (
      <CliqzProvider value={this.cliqz}>
        <SearchUI results={results} theme={theme} meta={meta} />
      </CliqzProvider>
    );
    /* eslint-enable */
  }

  componentDidMount() {
    this.cliqz.mobileCards.sendUIReadySignal();
  }
}
