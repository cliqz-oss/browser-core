import React from 'react';
import {
  getMaxHeightValue,
  highlightTokens,
  modifyTokenAtIndex,
  shouldModifyToken,
  squashEmptyTokensWithPattern,
} from './search-result-item-helper';

const handleDescriptionBlockContent = (element, text, query) => {
  if (!element) {
    return;
  }

  const NUMBER_OF_TOKENS_AROUND_MATCHES = 3;
  const maxHeightValue = getMaxHeightValue(element);

  if (element.scrollHeight <= maxHeightValue) {
    element.innerHTML = highlightTokens(text, query.split(/\s+/)); // eslint-disable-line no-param-reassign
    element.classList.remove('searchbox-results-item-description-invisible');
    return;
  }

  const queryMap = {};
  const nextText = text.split(/\s+/);
  query.split(/\s+/).forEach((item) => {
    queryMap[item.toLowerCase()] = 1;
  });

  const matchedTokenDictionary = {};
  nextText.forEach((item, index) => {
    if (queryMap[item.toLowerCase()]) {
      matchedTokenDictionary[index] = 1;
    }
  });

  let shouldCheckNextTokenAgainstModification = true;
  let i = nextText.length - 1;
  while (i >= 0 && element.scrollHeight > maxHeightValue) {
    if (shouldCheckNextTokenAgainstModification
      && !shouldModifyToken(i, matchedTokenDictionary, NUMBER_OF_TOKENS_AROUND_MATCHES)) {
      i -= 1;
      continue; // eslint-disable-line no-continue
    }

    shouldCheckNextTokenAgainstModification = false;

    const nextIndex = modifyTokenAtIndex(nextText, i);
    element.innerHTML = nextText.join(' '); // eslint-disable-line no-param-reassign

    if (i !== nextIndex) {
      shouldCheckNextTokenAgainstModification = true;
    }
    i = nextIndex;
  }

  squashEmptyTokensWithPattern(nextText, '...');
  element.innerHTML = nextText.join(' '); // eslint-disable-line no-param-reassign

  i = nextText.length - 1;
  while (element.scrollHeight > maxHeightValue) {
    i = modifyTokenAtIndex(nextText, i);
    element.innerHTML = nextText.join(' '); // eslint-disable-line no-param-reassign
  }

  const innerHTML = nextText.join(' ').replace(/.{4}$/, '...');
  element.innerHTML = highlightTokens(innerHTML, query.split(/\s+/)); // eslint-disable-line no-param-reassign
  element.classList.remove('searchbox-results-item-description-invisible');
};

export default ({
  item = {},
  shouldHandleSearchResultItemView,
  query,
} = {}) => {
  let result;

  if (!item.description) {
    result = null;
  } else {
    result = (
      <div
        className="searchbox-results-item-description searchbox-results-item-description-invisible"
        ref={element =>
          shouldHandleSearchResultItemView
          && handleDescriptionBlockContent(element, item.description, query)
        }
      >
        {item.description}
      </div>
    );
  }

  return result;
};
