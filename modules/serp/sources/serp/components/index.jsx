import Spanan from 'spanan';
import React from 'react';
import { getMessage } from '../../../core/i18n';
import Storage from '../../../core/storage';
import SerpPageVariation from './serp-page-variation';

import t from '../services/i18n';

const ENTER_KEY = 'Enter';
const storage = new Storage();

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
  constructor(props) {
    super(props);

    this._ABTestValue = storage.getItem('serp_test');
  }

  state = {
    items: [],
    isLoading: false,
  };

  componentDidMount() {
    window.CliqzEvents.sub('search:results', ({ results }) => {
      if (!results || !results.length) {
        return;
      }

      this._handleResults(results);
    });
    window.addEventListener('hashchange', this._handleHashChange);

    this._handleHashChange();
  }

  componentDidUpdate() {
    this.textInput.value = this._getLocationHash();
    this.textInput.focus();
  }

  _getLocationHash() {
    // As according to this
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Malformed_URI
    // we need to handle potential URIError
    // In case of a wrong high/low surrogate pair
    // URIError might occur during decoding/encoding;
    const hashValue = window.location.hash.slice(1).replace(/\+/g, '%2B');

    try {
      return unescape(hashValue);
    } catch (e) {
      return hashValue;
    }
  }

  _setLocationHash(hash) {
    try {
      window.location.hash = escape(hash);
    } catch (e) {
      window.location.hash = hash;
    }
  }

  _handleHashChange = () => {
    // TODO: remove it in the future version.
    const hashValue = window.location.hash.slice(1);
    if (hashValue) {
      window.location.hash = hashValue.replace(/\+/g, ' ');
    }
    //
    const query = this._getLocationHash();

    if (!query) {
      this._handleResults(null);
      return;
    }

    this.setState({
      isLoading: true
    });

    cliqz.search.startSearch(
      query, {
        keyCode: ENTER_KEY
      }
    );
  }

  _handleResults = (list) => {
    if (list) {
      // TODO: remove those hardcode instant
      // provider handling;
      const results = list.filter(item =>
        item &&
        item.provider !== 'instant' &&
        item.provider !== 'calculator');
      //

      this.setState({
        isLoading: false,
        items: results.map((item) => {
          const res = {
            description: item.description,
            type: item.type,
            title: item.title || item.text,
            href: item.href,
            hrefText: item.friendlyUrl,
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
      if (this.textInput && !this.textInput.value) {
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

  handleKeyDown = (event) => {
    const query = this._getQuery();

    if (!query) {
      return;
    }

    if (ENTER_KEY === event.key) {
      this._setLocationHash(query);
    }
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

  _renderSearchField(...cssClasses) {
    cssClasses.push('searchbox-field');

    return (
      <input
        id="searchbox"
        type="text"
        className={cssClasses.join(' ')}
        placeholder={t('search_with_cliqz')}
        ref={(input) => { this.textInput = input; }}
        onKeyDown={this.handleKeyDown}
      />
    );
  }

  _onSearchIconClickHandler = (event) => {
    const query = this._getQuery();
    if (!query) {
      event.preventDefault();
      return;
    }
    try {
      event.target.setAttribute('href', `#${escape(query)}`);
    } catch (e) {
      event.target.setAttribute('href', `#${query}`);
    }
  }

  _getQuery() {
    return this.textInput
      ? this.textInput.value.trim()
      : this._getLocationHash();
  }

  _getLayoutConfig(renderStartSearchPage) {
    const layoutConfig = {
      searchField: this._renderSearchField('searchbox-field-main'),
      query: this.textInput
        ? this.textInput.value.trim()
        : this._getLocationHash(),
      submitIconClickHandler: this._onSearchIconClickHandler,
    };

    if (renderStartSearchPage) {
      return layoutConfig;
    }

    return Object.assign(layoutConfig, {
      results: this.state.items,
      searchField: this._renderSearchField('searchbox-field-results'),
    });
  }

  render() {
    const renderStartSearchPage = !this._getLocationHash();

    return (
      <SerpPageVariation
        ABTestValue={this._ABTestValue}
        renderStartSearchPage={renderStartSearchPage}
        layoutConfig={this._getLayoutConfig(renderStartSearchPage)}
        isLoading={this.state.isLoading}
      />
    );
  }
}
