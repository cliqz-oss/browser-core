import React from 'react';
import AnzeigeLabel from './anzeige-label';
import t from '../services/i18n';

const renderAnzeigeLabel = (isOffer) => {
  if (!isOffer) {
    return null;
  }

  return <AnzeigeLabel text={t('offer')} cssClasses={['anzeige-layout']} />;
};

// This method basically checks whether a descriprion is too long,
// and if it is then gets it reduced.
// Too long means to span over 3 lines of text.
// Initially a description block has a maximal height of its'
// 3 line-height. Which is set in a css file.
// What is important here is not the number of characters in
// description but whether it actually spans over 3 lines.
// Example (what might happen):
// 1 line starts> fgfgfdgdf                        < 1 line ends
// 2 line starts> dhgkhfdkghdkghkdfhlkjhfghkfh h hg< 2 line ends
// 3 line starts> fhggfg g gfg gfgfgfg gfgf fgfggfg< 3 line ends
// 4 line starts> dsffdgfdgfdgdfgdfg               < 4 line ends
// As is seen from the example lines 1-3 have less
// symbols than they could physically have but still
// those symbols share 3 lines in a description. This
// happens because the second line is too long to fit into
// the 1st one with its' own content.
// Below we can handle such cases. And modify description
// block innerHTML on a fly.
// If description does not span over 3 lines then it remains unchanged,
// which means we do not change element's innerHTML property.
const reduceDescriptionToProperSize = (() => {
  let maxHeightValue = -1;

  return (element, description) => {
    if (!element) {
      // By whatever reason element does not exist;
      // Return false;
      return false;
    }

    // Split description text by every single char.
    // To loop thgough them further.
    const nextDescription = description.split('');

    // We need to define maximal height, that is a height
    // which is set in a css file for a description block;
    maxHeightValue = maxHeightValue > -1
      ? maxHeightValue
      : Math.ceil(parseFloat(window.getComputedStyle(element)['max-height']));

    // Because of how a browser renders a page max-height
    // might be slightly different from what we could have of
    // clientHeight - a live property of an element itself.
    // Compare them against each other and pick up the largest one.
    const nextClientHeight = element.clientHeight;
    maxHeightValue = nextClientHeight >= maxHeightValue
      ? nextClientHeight
      : maxHeightValue;

    // Turns out a scrollHeight of a description block
    // to be less than or equal to maximal calculated height.
    // We return false in that case. Meaning we have not modified
    // anything.
    if (element.scrollHeight <= maxHeightValue) {
      return false;
    }

    let length = nextDescription.length;
    // Loop it through until description block
    // content does not span over 3 lines.
    // Removing the last symbol from description
    // one at a time as we loop through. And then
    // return true to signal we have modified the
    // description.
    const n = 1;
    while (n > 0) {
      length -= 1;
      nextDescription.length = length;
      element.innerHTML = nextDescription.join(''); // eslint-disable-line no-param-reassign

      if (element.scrollHeight <= maxHeightValue) {
        return true;
      }
    }

    // For style compliance reasons return a boolean
    // value here as well. Though we will never reach this.
    return false;
  };
})();

export default ({ item = {}, idx, isOffer, shouldDisplaySearchResultItemLogo, session } = {}) => (
  <div
    className="searchbox-results-item result"
    data-session={session}
    data-idx={idx}
  >
    {
      shouldDisplaySearchResultItemLogo &&
      (
        <span
          className="searchbox-results-item-logo"
          style={item.logoStyle}
        >
          {item.logoText}
        </span>
      )
    }
    <a
      href={item.href}
      className="searchbox-results-item-title"
      data-telemetry="result"
      data-telemetry-element="title"
    >
      {item.title}
    </a>
    <div>
      {renderAnzeigeLabel(isOffer)}
      <a
        href={item.href}
        className="searchbox-results-item-url"
        data-telemetry="result"
        data-telemetry-element="url"
      >
        {item.hrefText}
      </a>
    </div>
    {
      item.description &&
      (
        <div
          className="searchbox-results-item-description searchbox-results-item-description-invisible"
          ref={
            (element) => {
              if (!element) {
                return;
              }

              const result = reduceDescriptionToProperSize(element, item.description);
              if (result) {
                element.innerHTML = element.innerHTML.replace(/.{3}$/, '...'); // eslint-disable-line no-param-reassign
              }
              element.classList.remove('searchbox-results-item-description-invisible');
            }
          }
        >
          {item.description}
        </div>
      )
    }
  </div>
);
