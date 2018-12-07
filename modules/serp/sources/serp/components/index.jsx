import Spanan from 'spanan';
import React from 'react';
import { getMessage } from '../../../core/i18n';
import SerpPageVariation from './serp-page-variation';
import random from '../../../core/helpers/random';

const ENTER_KEY = 'Enter';
const SEARCH_SUGGESTIONS = 'search:suggestions';
const SEARCH_RESULTS = 'search:results';

const cliqz = {
  search: {
    startSearch(...args) {
      return window.CLIQZ.app.modules.search.action('startSearch', ...args);
    },
    getAssistantStates(...args) {
      return window.CLIQZ.app.modules.search.action('getAssistantStates', ...args);
    },
  },
};

export default class Serp extends React.Component {
  _session = random(32)

  state = {
    // Since query suggestions come from the same
    // entry point which provide search results
    // we need to distinguish between the two responses
    // not to display suggestions when requested for
    // search results explicitly.
    searchRequestInitiator: SEARCH_RESULTS,
    items: [],
    isLoading: false,
    searchBoxValue: '',
  }

  componentDidMount() {
    window.CliqzEvents.sub(SEARCH_RESULTS, ({ results }) => {
      if (this.state.searchRequestInitiator !== SEARCH_RESULTS
        || !results
        || !results.length) {
        return;
      }

      this._session = random(32);
      this._handleResults(results);
    });

    window.addEventListener('hashchange', this._handleHashChange);

    this._handleHashChange();
  }

  _getLocationHash() {
    // As according to this
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Malformed_URI
    // we need to handle potential URIError
    // In case of a wrong high/low surrogate pair
    // URIError might occur during decoding/encoding;
    const hashValue = window.location.hash.slice(1);

    try {
      return decodeURIComponent(hashValue);
    } catch (e) {
      return hashValue;
    }
  }

  _setLocationHash = (hash) => {
    try {
      window.location.hash = encodeURIComponent(hash);
    } catch (e) {
      window.location.hash = hash;
    }

    // Here we need to force it triggered.
    // Whatever a user looks for the same result.
    // Because this tends to be more user-friendly.
    this._handleHashChange();
  }

  _handleHashChange = () => {
    // TODO: remove it in the future version.
    const hashValue = window.location.hash.slice(1);
    if (hashValue) {
      window.location.hash = hashValue.replace(/\+/g, ' ');
    }

    const query = this._getLocationHash();

    if (!query) {
      this._handleResults(null);
      return;
    }

    this.setState({
      isLoading: true,
      searchBoxValue: query,
    });

    cliqz.search.startSearch(
      query, {
        keyCode: ENTER_KEY
      }
    );
  }

  updateRequestInitiator = (nextRequestInitiator) => {
    if (nextRequestInitiator === SEARCH_RESULTS
      || nextRequestInitiator === SEARCH_SUGGESTIONS) {
      this.setState({
        searchRequestInitiator: nextRequestInitiator,
      });
    }
  }

  _handleResults = (list) => {
    if (list) {
      // TODO: remove those hardcode instant
      // provider handling;
      const results = list.filter(item =>
        item
        && item.provider !== 'instant'
        && item.provider !== 'calculator');
      //

      this.setState({
        isLoading: false,
        items: results.map((item) => {
          const logo = (item.meta && item.meta.logo) || {};

          const backgroundImage = logo.style.match(/background-image:\s*(.+?);/);
          const backgroundColor = logo.style.match(/background-color:\s*(.+?);/);
          const color = logo.style.match(/color:\s*(.+?);/);

          const logoStyle = {
            backgroundColor: backgroundColor === null ? '' : backgroundColor[1],
            backgroundImage: backgroundImage === null ? '' : backgroundImage[1],
            color: color === null ? '' : color[1],
          };
          const logoText = logo.text;

          const res = {
            logoStyle,
            logoText,
            description: item.description,
            type: item.type,
            title: item.title || item.text,
            href: item.href,
            hrefText: item.friendlyUrl,
            isOffer: item.provider === 'cliqz::offers',
          };
          return res;
        })
      });
    } else {
      this.setState({
        isLoading: false,
        items: [],
      });
    }
  }

  async _render(results) {
    const firstResult = results && results[0];
    if (!firstResult) {
      if (!this.getSearchBoxValue()) {
        this.setHeight(0);
      }
      return;
    }

    const assistantStates = await cliqz.search.getAssistantStates();
    const query = firstResult.text;
    const queriedAt = Date.now();

    this.previousQuery = query;
    this.previousResults = results;

    await this.dropdownAction.render({
      rawResults: results,
      query,
      queriedAt,
    }, {
      assistantStates,
      urlbarAttributes: {
        padding: 35
      },
      maxHeight: this.maxHeight,
    });
  }

  get maxHeight() {
    return 500;
  }

  _handleKeyDown = (event) => {
    const query = this.getSearchBoxValue();

    if (!query) {
      return;
    }

    if (ENTER_KEY === event.key) {
      this.setState({
        searchRequestInitiator: SEARCH_RESULTS,
      });

      this._setLocationHash(query);
    }
  }

  updateSearchboxValue = (nextValue) => {
    this.setState({
      searchBoxValue: nextValue,
    });
  }

  createIframeWrapper = (iframe) => {
    if (!iframe) {
      return;
    }

    this.iframe = iframe;

    const iframeWrapper = new Spanan(({ action, ...rest }) => {
      iframe.contentWindow.postMessage({
        target: 'cliqz-dropdown',
        action,
        ...rest,
      }, '*');
    });

    this.iframeWrapper = iframeWrapper;

    // Somehow the chrome.i18n object is missing on iframes in Chrome
    try {
      // eslint-disable-next-line
      iframe.contentWindow.chrome = {
        i18n: {
          getMessage,
        },
      };
    } catch (e) {
      // throws on platform firefox, but i18n is there already
    }

    iframe.contentWindow.addEventListener('message', this.onMessage);

    iframeWrapper.export(this.actions, {
      respond(response, request) {
        iframe.contentWindow.postMessage({
          type: 'response',
          uuid: request.uuid,
          response,
        }, '*');
      },
    });

    this.dropdownAction = iframeWrapper.createProxy();
  }

  _renderDropdownFrame() {
    return (
      <iframe
        className="cliqz-dropdown"
        tabIndex="-1"
        title="Results"
        ref={this.createIframeWrapper}
        src="../dropdown/dropdown.html"
      />
    );
  }

  _onSearchIconClickHandler = (event) => {
    const query = this.getSearchBoxValue();
    if (!query) {
      event.preventDefault();
      return;
    }

    this.setState({
      searchRequestInitiator: SEARCH_RESULTS,
    });

    try {
      event.target.setAttribute('href', `#${encodeURIComponent(query)}`);
    } catch (e) {
      event.target.setAttribute('href', `#${query}`);
    }
  }

  getSearchBoxValue = () =>
    this.state.searchBoxValue;

  getNextProps(renderStartSearchPage) {
    const props = {
      handleKeyDown: this._handleKeyDown,
      handleSubmitIconClick: this._onSearchIconClickHandler,
      updateSearchboxValue: this.updateSearchboxValue,
      updateRequestInitiator: this.updateRequestInitiator,
      setLocationHash: this._setLocationHash,
      query: this.getSearchBoxValue(),
      renderStartSearchPage,
      searchRequestInitiator: this.state.searchRequestInitiator,
      isLoading: this.state.isLoading,
      session: this._session,
    };

    if (renderStartSearchPage) {
      return props;
    }

    return Object.assign(props, {
      results: this.state.items,
    });
  }

  render() {
    const renderStartSearchPage = !this._getLocationHash();

    return (
      <SerpPageVariation {...this.getNextProps(renderStartSearchPage)} />
    );
  }
}
