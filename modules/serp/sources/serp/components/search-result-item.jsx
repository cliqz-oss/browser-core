import React from 'react';
import AnzeigeLabel from './anzeige-label';
import t from '../services/i18n';
import SearchResultItemTitle from './search-result-item-title';
import SearchResultItemUrl from './search-result-item-url';
import SearchResultItemDescription from './search-result-item-description';

const renderAnzeigeLabel = (isOffer) => {
  if (!isOffer) {
    return null;
  }

  return <AnzeigeLabel text={t('offer')} cssClasses={['anzeige-layout']} />;
};

export default ({
  item = {},
  idx,
  isOffer,
  shouldDisplaySearchResultItemLogo,
  shouldHandleSearchResultItemView,
  session,
  query,
} = {}) => (
  <div
    className="searchbox-results-item result"
    data-session={session}
    data-idx={idx}
  >
    {
      shouldDisplaySearchResultItemLogo
      && (
        <span
          className="searchbox-results-item-logo"
          style={item.logoStyle}
        >
          {item.logoText}
        </span>
      )
    }
    <SearchResultItemTitle
      shouldHandleSearchResultItemView={shouldHandleSearchResultItemView}
      item={item}
    />
    <div>
      {renderAnzeigeLabel(isOffer)}
      <SearchResultItemUrl
        shouldHandleSearchResultItemView={shouldHandleSearchResultItemView}
        item={item}
      />
    </div>
    <SearchResultItemDescription
      shouldHandleSearchResultItemView={shouldHandleSearchResultItemView}
      item={item}
      query={query}
    />
  </div>
);
