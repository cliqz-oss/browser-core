import React from 'react';
import SearchboxResultsLayout from './searchbox-results-layout';
import SearchboxLayout from './searchbox-layout';
import FooterV1 from './variations/v1/footer';
import FooterV3 from './variations/v3/footer';
import Storage from '../../../core/storage';
import { setTimeout } from '../../../core/timers';

const ENTER_KEY = 'Enter';
const SEARCH_SUGGESTIONS = 'search:suggestions';
const SEARCH_RESULTS = 'search:results';

const cliqz = {
  search: {
    startSearch(...args) {
      return window.CLIQZ.app.modules.search.action('startSearch', ...args);
    },
  },
};

const genericTelemetryMetrics = ({ message, suggestionCount }) =>
  ({ queryLength, resultCount, session }) => {
    window.postMessage({
      message,
      payload: {
        queryLength,
        resultCount,
        suggestionCount,
        session,
      }
    }, '*');
  };

const landingTelemetryMetrics = genericTelemetryMetrics({
  message: 'landing', suggestionCount: 0
});
const resultsTelemetryMetrics = genericTelemetryMetrics({
  message: 'results', suggestionCount: 0
});
const storage = new Storage();

export default class SerpPageVariation extends React.Component {
  constructor(props = {}) {
    super(props);

    // ABTestExperimentsSerpValue --------------->
    // "offers_test"          SERP with offers
    // "offers_control"       SERP without offers
    // "suggestions_test"     SERP with query suggestions
    // "suggestions_control"  SERP without query suggestions

    this._ABTestValue = storage.getItem('serp_test');
    this._ABTestExperimentsSerpValue = storage.getItem('experiments.serp');

    this._isLoading = props.isLoading === true;
    this._renderStartSearchPage = props.renderStartSearchPage === true;

    this._querySuggestionsTimer = null;
    this._searchRequestInitiator = props.searchRequestInitiator;

    this.propsSetLocationHash = typeof props.setLocationHash === 'function'
      ? props.setLocationHash
      : () => {};

    this.propsUpdateRequestInitiator = typeof props.updateRequestInitiator === 'function'
      ? props.updateRequestInitiator
      : () => {};

    this.propsUpdateSearchboxValue = typeof props.updateSearchboxValue === 'function'
      ? props.updateSearchboxValue
      : () => {};

    this._shouldDisplayQuerySuggestions = this._ABTestExperimentsSerpValue === 'suggestions_test';
    this._session = props.session;
    this._nextQuerySuggestions = [];

    this.state = {
      propsSearchBoxValue: props.query,
      searchBoxValue: props.query,
      querySuggestions: [],
      results: props.results || [],
    };
  }

  componentDidMount() {
    if (!this._shouldDisplayQuerySuggestions) {
      return;
    }

    window.CliqzEvents.sub(SEARCH_SUGGESTIONS, ({ query, suggestions }) => {
      if (this._searchRequestInitiator !== SEARCH_SUGGESTIONS) {
        return;
      }

      this._handleSuggestions({ query, suggestions });
    });
  }

  componentWillReceiveProps(nextProps) {
    this._searchRequestInitiator = nextProps.searchRequestInitiator;
    this._renderStartSearchPage = nextProps.renderStartSearchPage;
    this._isLoading = nextProps.isLoading === true;
    this._session = nextProps.session;

    if (this.state.propsSearchBoxValue !== nextProps.query) {
      this.setState({
        propsSearchBoxValue: nextProps.query,
      });
    }

    this.setState({
      results: nextProps.results,
    });

    // After we have received new results
    // we need to make sure that any query
    // suggestions have disappeared;
    if (this._searchRequestInitiator === SEARCH_RESULTS) {
      this.closeQuerySuggestions();
    }
  }

  getNextProps() {
    const props = {
      results: this.state.results,
      query: this.state.propsSearchBoxValue,
      prevQuery: this.state.searchBoxValue,
      querySuggestions: this.state.querySuggestions,
      isLoading: this._isLoading,
      handleKeyDown: this.props.handleKeyDown,
      handleFocus: this._handleSearchboxFocus,
      handleBlur: this._handleSearchboxBlur,
      handleSubmitIconClick: this.props.handleSubmitIconClick,
      updateSearchboxValue: this.updateSearchboxValue,
      handleItemSuggestion: this._handleItemSuggestion,
      handleItemSelection: this._handleSuggestedItemSelection,
      shouldDisplayQuerySuggestions: this._shouldDisplayQuerySuggestions,
      shouldDisplayOffers: this._ABTestExperimentsSerpValue === 'offers_test',
      shouldDisplayAlternativeEnginesAtTop: this._ABTestValue !== 'G',
      shouldDisplaySearchResultItemLogo: this._ABTestValue === 'K' || this._ABTestValue === 'O',
      shouldDisplayLookAndFeelV1: this._ABTestValue !== 'J'
        && this._ABTestValue !== 'N'
        && this._ABTestValue !== 'K'
        && this._ABTestValue !== 'O',
      shouldDisplayLookAndFeelV3: this._ABTestValue === 'J'
        || this._ABTestValue === 'N'
        || this._ABTestValue === 'K'
        || this._ABTestValue === 'O',
      shouldHandleSearchResultItemView: this._searchRequestInitiator === SEARCH_RESULTS,
      v1ResultsFromCliqz: this._ABTestValue === 'F',
      session: this._session,
    };

    return props;
  }

  closeQuerySuggestions = () => {
    // If query suggestions are not displayed
    // initially then nothing should be hidden;
    if (!this._shouldDisplayQuerySuggestions) {
      return;
    }

    if (this.state.querySuggestions.length > 0) {
      this.setState({
        querySuggestions: [],
      });
    }
  }

  _handleSearchboxFocus = () => {
    if (!this._shouldDisplayQuerySuggestions) {
      return;
    }

    this.setState({
      querySuggestions: this._nextQuerySuggestions,
    });
  }

  _handleSearchboxBlur = () => {
    if (!this._shouldDisplayQuerySuggestions) {
      return;
    }

    this.closeQuerySuggestions();
  }

  _handleSuggestions = ({ query, suggestions }) => {
    let hasSuggestions = true;
    // First we need to check an actual value of a searchbox field.
    // A request for new portion of query suggestions could be sent.
    // And then a user could type something really quickly.
    // Which stops it from sending another request. But still.
    // We have a former request/response to handle here.

    // this.state.searchBoxValue could be different than
    // query value. Please see comments above.
    if (!this.state.searchBoxValue) {
      this.closeQuerySuggestions();
      return;
    }

    if (suggestions && suggestions.length > 0) {
      this._nextQuerySuggestions = suggestions.map((suggestion) => {
        const res = { title: suggestion };
        return res;
      });

      this.setState({
        querySuggestions: this._nextQuerySuggestions,
      });
    } else {
      hasSuggestions = false;
      this.closeQuerySuggestions();
    }

    window.postMessage({
      message: 'serp:character-typed',
      payload: {
        queryLength: query.length,
        session: this._session,
        hasSuggestions,
      }
    }, '*');
  }

  _handleItemSuggestion = (suggestedItem) => {
    this.propsUpdateSearchboxValue(suggestedItem.title);
  }

  _handleSuggestedItemSelection = (event, selectedItem) => {
    event.preventDefault();

    // selectedItem could be undefined
    // if a user has not selected anything
    // in a query suggestion dropdown;
    if (!selectedItem) {
      return;
    }

    this.closeQuerySuggestions();

    this._searchRequestInitiator = SEARCH_RESULTS;
    this.propsUpdateRequestInitiator(this._searchRequestInitiator);
    this.propsSetLocationHash(selectedItem.title);
  }

  updateSearchboxValue = (nextValue) => {
    this.setState({
      searchBoxValue: nextValue,
    });
    this.propsUpdateSearchboxValue(nextValue);

    if (!this._shouldDisplayQuerySuggestions) {
      return;
    }

    clearTimeout(this._querySuggestionsTimer);
    this._searchRequestInitiator = SEARCH_SUGGESTIONS;
    this.propsUpdateRequestInitiator(this._searchRequestInitiator);

    this._querySuggestionsTimer = setTimeout(() => {
      cliqz.search.startSearch(
        nextValue.trim(), {
          keyCode: ENTER_KEY
        }
      );
    }, 150);
  }

  render() {
    const query = this.state.propsSearchBoxValue;
    const props = this.getNextProps();

    if (this._renderStartSearchPage) {
      landingTelemetryMetrics({
        queryLength: query.length,
        resultCount: 0,
        session: this._session,
      });

      return (
        <div>
          <SearchboxLayout {...props} />
          {props.shouldDisplayLookAndFeelV1 && <FooterV1 />}
          {props.shouldDisplayLookAndFeelV3 && <FooterV3 />}
        </div>
      );
    }
    if (!this._isLoading) {
      const results = this.state.results || [];

      resultsTelemetryMetrics({
        queryLength: query.length,
        resultCount: results.length,
        session: this._session,
      });
    }

    return (
      <div>
        <SearchboxResultsLayout {...props} />
        {props.shouldDisplayLookAndFeelV1 && <FooterV1 />}
        {props.shouldDisplayLookAndFeelV3 && <FooterV3 />}
      </div>
    );
  }
}
