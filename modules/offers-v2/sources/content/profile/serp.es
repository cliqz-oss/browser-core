function getInputFields(document) {
  return document.querySelectorAll('input[type=text i], input[type=search i]');
}

function doesTitleContainWordSearch(document, inputs) {
  if (!inputs.length) {
    return false;
  }
  const wordSearch = ['search', 'suche'];
  const title = document.title.toLowerCase();
  return wordSearch.some(w => title.includes(w));
}

function isNameOfInputTextFieldInUrl(document, inputs) {
  const isNameInQueryParameters = (name) => {
    const queryString = document.location.search;
    return queryString.includes(`&${name}=`)
      || queryString.includes(`?${name}=`);
  };
  const fieldNames = Array.from(inputs, i => i.name);
  return fieldNames.some(isNameInQueryParameters);
}

export function isSearchResultPage(document) {
  const inputs = getInputFields(document);
  return doesTitleContainWordSearch(document, inputs)
    || isNameOfInputTextFieldInUrl(document, inputs);
}

export function serpPageDetection(window, chrome, CLIQZ) {
  if (window.parent !== window) {
    return;
  }

  const onDomContentLoaded = () => {
    if (isSearchResultPage(window.document)) {
      CLIQZ.app.modules['offers-v2'].action(
        'learnTargeting',
        'page-class',
        {
          feature: 'serp',
          url: window.document.location.href,
        }
      );
    }
  };

  window.addEventListener('DOMContentLoaded', onDomContentLoaded, { once: true });
}
