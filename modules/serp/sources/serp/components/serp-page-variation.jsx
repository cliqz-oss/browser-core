import React from 'react';
import SearchboxResultsLayout from './searchbox-results-layout';
import SearchboxLayout from './searchbox-layout';

export default ({
  ABTestValue,
  renderStartSearchPage,
  layoutConfig,
  isLoading,
}) => {
  if (!isLoading) {
    if (renderStartSearchPage) {
      window.postMessage({
        message: 'landing',
        payload: {
          queryLength: layoutConfig.query.length,
          resultCount: 0,
          suggestionCount: 0,
        }
      }, '*');

      return (
        <SearchboxLayout
          query={layoutConfig.query}
          onSubmitIconClick={layoutConfig.submitIconClickHandler}
          searchField={layoutConfig.searchField}
        />
      );
    }

    window.postMessage({
      message: 'results',
      payload: {
        queryLength: layoutConfig.query.length,
        resultCount: layoutConfig.results.length,
        suggestionCount: 0,
      }
    }, '*');
  }

  return (
    <SearchboxResultsLayout
      query={layoutConfig.query}
      onSubmitIconClick={layoutConfig.submitIconClickHandler}
      searchField={layoutConfig.searchField}
      results={layoutConfig.results}
      isLoading={isLoading}
      engineVariation={ABTestValue}
    />
  );
};
