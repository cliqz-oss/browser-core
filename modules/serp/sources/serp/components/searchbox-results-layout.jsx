import React from 'react';
import classNames from 'classnames';
import LoadingStateLayout from './loading-state-layout';
import EmptyResultsBlock from './empty-results-block';
import SearchResultItem from './search-result-item';
import AlternativeSearchEngines from './variations/v1/alternative-search-engines';
import ResultsBlockHeader from './results-block-header';
import t from '../services/i18n';
import renderQuerySuggestions from './variations/v2/dropdown-helper';
import renderSearchField from './searchbox-field-helper';
import renderSearchboxSubmitIcon from './searchbox-submit-icon-helper';

const renderLoadingStateLayout = () => (
  <div>
    <LoadingStateLayout />
    <LoadingStateLayout />
    <LoadingStateLayout />
  </div>
);

const renderSearchboxIconBlock = searchboxIconClasses => (
  <a
    href="/"
    className={searchboxIconClasses}
  >
    Home
  </a>
);

const renderEmptyResultsBlock = () => <EmptyResultsBlock />;

const renderSearchResultItem = ({
  item,
  uniqueKey,
  shouldDisplayOffers,
  shouldDisplaySearchResultItemLogo,
  shouldHandleSearchResultItemView,
  session,
  query,
}) => {
  if (item.isOffer && !shouldDisplayOffers) {
    return null;
  }

  return (
    <SearchResultItem
      item={item}
      key={uniqueKey}
      idx={uniqueKey}
      isOffer={shouldDisplayOffers && item.isOffer}
      shouldDisplaySearchResultItemLogo={shouldDisplaySearchResultItemLogo}
      shouldHandleSearchResultItemView={shouldHandleSearchResultItemView}
      session={session}
      query={query}
    />
  );
};

const renderSearchCategoriesBlock = ({ query, dropdownCss, session }) => (
  <AlternativeSearchEngines
    session={session}
    query={query}
    dropdownCss={dropdownCss}
  />
);

const renderResultsBlockHeader = (results, searchboxResultsFromCliqzCss) => (
  <ResultsBlockHeader results={results} cssClasses={searchboxResultsFromCliqzCss} />
);

export default (props = {}) => {
  const isLoading = props.isLoading === true;

  const results = props.results || [];
  const query = props.query || '';
  const prevQuery = props.prevQuery || '';
  const handleSubmitIconClick = typeof props.handleSubmitIconClick === 'function'
    ? props.handleSubmitIconClick
    : () => {};

  const shouldDisplayAlternativeEnginesAtTop = props.shouldDisplayAlternativeEnginesAtTop;
  const v1ResultsFromCliqz = props.v1ResultsFromCliqz;
  const querySuggestions = props.querySuggestions;
  const handleKeyDown = props.handleKeyDown;
  const handleFocus = props.handleFocus;
  const handleBlur = props.handleBlur;
  const updateSearchboxValue = props.updateSearchboxValue;
  const handleItemSuggestion = props.handleItemSuggestion;
  const handleItemSelection = props.handleItemSelection;
  const shouldDisplayQuerySuggestions = props.shouldDisplayQuerySuggestions;
  const shouldDisplayOffers = props.shouldDisplayOffers;
  const shouldDisplayLookAndFeelV1 = props.shouldDisplayLookAndFeelV1;
  const shouldDisplayLookAndFeelV3 = props.shouldDisplayLookAndFeelV3;
  const shouldDisplaySearchResultItemLogo = props.shouldDisplaySearchResultItemLogo;
  const shouldHandleSearchResultItemView = props.shouldHandleSearchResultItemView;
  const session = props.session;

  let resultsBlock = null;
  if (isLoading) {
    resultsBlock = renderLoadingStateLayout();
  } else if (results.length) {
    resultsBlock = results.map((item, index) =>
      renderSearchResultItem({
        item,
        uniqueKey: index,
        shouldDisplayOffers,
        shouldDisplaySearchResultItemLogo,
        shouldHandleSearchResultItemView,
        session,
        query,
      }));
  } else {
    resultsBlock = renderEmptyResultsBlock();
  }

  const searchboxResultsLayoutCss = classNames({
    'searchbox-results-layout': true,
    'searchbox-v3-results-layout': shouldDisplayLookAndFeelV3,
  });

  const searchboxResultsFromCliqzCss = classNames({
    'searchbox-results-from-cliqz': true,
    'searchbox-v1-results-from-cliqz': v1ResultsFromCliqz,
  });

  const searchboxFieldLayoutCss = classNames({
    'searchbox-v1-field-layout': shouldDisplayLookAndFeelV1,
    'searchbox-v3-field-layout': shouldDisplayLookAndFeelV3,
  });

  const searchboxIconCss = classNames({
    'searchbox-icon': true,
    'searchbox-v1-icon': shouldDisplayLookAndFeelV1,
    'searchbox-v3-icon': shouldDisplayLookAndFeelV3,
  });

  const querySuggestionsCss = classNames({
    'dropdown-v2-results': !shouldDisplayLookAndFeelV3,
  });

  const dropdownCss = {
    layout: shouldDisplayLookAndFeelV3 ? ['dropdown-v3'] : [],
    ctrl: shouldDisplayLookAndFeelV3 ? ['dropdown-v3-ctrl'] : [],
  };

  return (
    <div
      className={searchboxResultsLayoutCss}
    >
      {
        shouldDisplayLookAndFeelV3
        && renderSearchboxIconBlock(searchboxIconCss)
      }
      <div
        className={searchboxFieldLayoutCss}
        data-view="results"
        data-group=""
        data-alternative-engine=""
        data-cliqz-default-engine=""
        data-session={session}
      >
        {
          shouldDisplayLookAndFeelV1
          && renderSearchboxIconBlock(searchboxIconCss)
        }
        {
          renderSearchField({
            query,
            handleKeyDown,
            handleFocus,
            handleBlur,
            updateSearchboxValue,
            placeholder: t('search_with_cliqz'),
            shouldDisplayLookAndFeelV1,
            shouldDisplayLookAndFeelV3,
            view: 'results',
            shouldHaveFocus: true,
          })
        }
        {
          renderSearchboxSubmitIcon({
            handleSubmitIconClick,
            shouldDisplayLookAndFeelV1,
            shouldDisplayLookAndFeelV3,
            telemetryView: 'results',
            session,
          })
        }
        {
          shouldDisplayQuerySuggestions && renderQuerySuggestions({
            items: querySuggestions,
            handleItemSuggestion,
            handleItemSelection,
            pattern: prevQuery,
            cssClasses: querySuggestionsCss,
            session,
          })
        }
      </div>
      {
        shouldDisplayAlternativeEnginesAtTop
        && renderSearchCategoriesBlock({
          query, dropdownCss, session,
        })
      }
      <div
        className="searchbox-results-section"
      >
        {renderResultsBlockHeader(results, searchboxResultsFromCliqzCss)}
        {resultsBlock}
      </div>
      {
        !shouldDisplayAlternativeEnginesAtTop
        && renderSearchCategoriesBlock({
          query, dropdownCss, session
        })
      }
    </div>
  );
};
