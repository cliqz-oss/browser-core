import React from 'react';
import classNames from 'classnames';
import LoadingStateLayout from './loading-state-layout';
import EmptyResultsBlock from './empty-results-block';
import SearchResultItem from './search-result-item';
import AlternativeSearchEngines from './variations/v1/alternative-search-engines';
import ResultsBlockHeader from './results-block-header';

const renderLoadingStateLayout = () => (
  <div>
    <LoadingStateLayout />
    <LoadingStateLayout />
    <LoadingStateLayout />
  </div>
);

const renderEmptyResultsBlock = () => <EmptyResultsBlock />;

const renderSearchResultItem = (item, uniqueKey) => (
  <SearchResultItem
    item={item}
    key={uniqueKey}
    idx={uniqueKey}
  />
);

const renderSearchCategoriesBlock = query => (
  <AlternativeSearchEngines
    query={query}
  />
);

const renderResultsBlockHeader = (results, searchboxResultsFromCliqzCss) => (
  <ResultsBlockHeader results={results} cssClasses={searchboxResultsFromCliqzCss} />
);

export default (props = {}) => {
  const searchField = props.searchField || null;
  const results = props.results || [];
  const isLoading = props.isLoading || false;
  const query = props.query || '';
  const onSubmitIconClick = typeof props.onSubmitIconClick === 'function'
    ? props.onSubmitIconClick
    : () => {};
  const engineVariation = props.engineVariation || '';

  let resultsBlock = null;
  if (isLoading) {
    resultsBlock = renderLoadingStateLayout();
  } else if (results.length) {
    resultsBlock = results.map(renderSearchResultItem);
  } else {
    resultsBlock = renderEmptyResultsBlock();
  }

  const searchboxResultsFromCliqzCss = classNames({
    'searchbox-results-from-cliqz': true,
    'searchbox-v1-results-from-cliqz': engineVariation === 'F',
  });

  return (
    <div
      className="searchbox-results-layout"
    >
      <div
        className="searchbox-field-layout"
        data-view="results"
        data-group=""
        data-alternative-engine=""
        data-cliqz-default-engine=""
      >
        <a
          href="/"
          className="searchbox-field-icon"
        >Home</a>
        {searchField}
        <a
          onClick={onSubmitIconClick}
          href="/"
          className="searchbox-field-submit-icon suggestion"
          data-telemetry="search-engine"
          data-engine="cliqz"
          data-view="results"
          data-category={null}
        >Search</a>
      </div>
      {engineVariation !== 'G' && renderSearchCategoriesBlock(query)}
      <div
        className="searchbox-results-section"
      >
        {renderResultsBlockHeader(results, searchboxResultsFromCliqzCss)}
        {resultsBlock}
      </div>
      {engineVariation === 'G' && renderSearchCategoriesBlock(query)}
    </div>
  );
};
