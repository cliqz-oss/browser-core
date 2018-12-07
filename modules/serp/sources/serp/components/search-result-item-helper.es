export const getMaxHeightValue = (element) => {
  if (!element) {
    return 0;
  }

  const maxHeightValue = Math.ceil(parseFloat(window.getComputedStyle(element)['max-height']));
  const nextClientHeight = element.clientHeight;

  if (isNaN(maxHeightValue)) {
    return nextClientHeight;
  }

  return nextClientHeight >= maxHeightValue
    ? nextClientHeight
    : maxHeightValue;
};

export const highlightTokens = (nextText = '', tokens = []) => {
  for (let i = 0, l = tokens.length; i < l; i += 1) {
    tokens[i] = tokens[i].trim(); // eslint-disable-line no-param-reassign
    if (tokens[i]) {
      nextText = nextText.replace( // eslint-disable-line no-param-reassign
        new RegExp(['(\\b', tokens[i], '\\b)'].join(''), 'ig'), '<b>$1</b>'
      );
    }
  }

  return nextText;
};

export const modifyTokenAtIndex = (tokens = [], index) => {
  const token = tokens[index];
  // We can not handle null|undefined in this context;
  if (token == null) {
    return index;
  }

  if (!token) {
    return index - 1;
  }

  tokens[index] = token.slice(0, token.length - 1); // eslint-disable-line no-param-reassign
  if (!tokens[index]) {
    return index - 1;
  }

  return index;
};

export const shouldModifyToken = (
  tokenIndex,
  matchedTokenDictionary,
  numberOfTokensAroundMatches
) => {
  if (matchedTokenDictionary[tokenIndex]) {
    return false;
  }

  let delta = 1;
  const k = 1;
  // Say Hello to eslint
  while (k > 0) {
    if (matchedTokenDictionary[tokenIndex]) {
      return false;
    }
    if (matchedTokenDictionary[tokenIndex - delta]
      || matchedTokenDictionary[tokenIndex + delta]
    ) {
      return false;
    }

    delta += 1;
    if (delta > numberOfTokensAroundMatches) {
      return true;
    }
  }

  return false;
};

export const squashEmptyTokensWithPattern = (nextText = [], pattern) => {
  let shouldSquash = true;

  for (let i = nextText.length; i >= 0; i -= 1) {
    if (nextText[i] == null) {
      continue; // eslint-disable-line no-continue
    } else if (!nextText[i] && shouldSquash) {
      shouldSquash = false;
      nextText[i] = pattern; // eslint-disable-line no-param-reassign
    } else if (nextText[i]) {
      shouldSquash = true;
    } else {
      nextText.splice(i, 1);
    }
  }
};
