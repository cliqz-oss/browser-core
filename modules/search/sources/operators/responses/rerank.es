/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getMainLink } from '../normalize';
import { PROVIDER_INSTANT, PROVIDER_OFFERS } from '../../consts';

const TYPE_ONLY_ANSWER = 'only-answer';
const TYPE_OVERVIEW = 'overview';
const TYPE_SUPPLEMENTARY = 'supplementary';

const TYPES = new Map([
  [1, TYPE_ONLY_ANSWER],
  [2, TYPE_OVERVIEW],
  [3, TYPE_SUPPLEMENTARY],
]);

const MAPPINGS = new Map([
  ['calculator', 1],
  ['currency', 1],
  ['dialing-code', 1],
  ['flight', 1],
  ['movie-showtimes', 1],
  ['time', 1],
  ['weatherEZ', 1],

  ['cinemaEZ', 2],
  ['entity-news-1', 2],
  ['entity-video-1', 2],
  ['ligaEZ1Game', 2],
  ['ligaEZGroup', 2],
  ['ligaEZTable', 2],
  ['liveTicker', 2],
  ['lotto', 2],
  ['movie', 2],

  ['generic', 3],
  ['hq', 3],
  ['people', 3],
  ['recipeRD', 3],
  ['single-video', 3],
]);

const decreaseKind = (kind = []) => kind.map((k) => {
  if (k.indexOf('X') !== 0) {
    return k;
  }
  return 'm';
});

/**
 * Move only-anser results to the top
 */
const moveOnlyAnswer = (results) => {
  const onlyAnswerIndex = results.findIndex((result) => {
    const template = getMainLink(result).template;
    return TYPES.get(MAPPINGS.get(template)) === TYPE_ONLY_ANSWER;
  });

  if (onlyAnswerIndex === -1) {
    return results;
  }

  const instantIndex = results.findIndex((result) => {
    const mainLink = getMainLink(result);
    return mainLink.provider === PROVIDER_INSTANT;
  });

  const isInstantFirst = instantIndex === 0;

  const rest = results.filter((result, index) => {
    if (isInstantFirst && (index === instantIndex)) {
      return false;
    }

    if (index === onlyAnswerIndex) {
      return false;
    }

    return true;
  });

  const onlyAnswerResult = results[onlyAnswerIndex];
  const instantResult = results[instantIndex];

  if (isInstantFirst) {
    return [
      instantResult,
      onlyAnswerResult,
      ...rest,
    ];
  }

  return [
    onlyAnswerResult,
    ...rest,
  ];
};

/**
 * Moves offer result after the next result if next result has a completion
 */
const moveOffers = (results) => {
  const offerIndex = results.findIndex((result) => {
    const mainLink = getMainLink(result);
    return mainLink.provider === PROVIDER_OFFERS;
  });

  if (offerIndex === -1) {
    return results;
  }

  const nextAfterOfferIndex = offerIndex + 1;
  const offerResults = results[offerIndex];
  const nextAfterOfferResult = results[nextAfterOfferIndex];

  if (!nextAfterOfferResult) {
    return results;
  }

  if (!getMainLink(nextAfterOfferResult).meta.completion) {
    return results;
  }

  return [
    ...results.slice(0, offerIndex),
    nextAfterOfferResult,
    offerResults,
    ...results.slice(nextAfterOfferIndex + 1),
  ];
};

const generalizeResult = (result, meta = {}) => {
  const mainLink = getMainLink(result);
  const generalizedResult = {
    ...result.links[0],
    kind: decreaseKind(mainLink.kind),
    ...meta,
  };
  delete generalizedResult.extra;
  return generalizedResult;
};

/**
 * Pomotes specific types of results and ensures that offers do not hide
 * autocompletable results.
 *
 * @function rerank
 * @param {Obkect} response$ - The response.
 */
export default ({ results: _results, ...response }) => {
  let results = moveOffers(_results);
  results = moveOnlyAnswer(results);

  /* eslint-disable no-param-reassign */
  const {
    overview,
    supplementary,
    supplementaryStart,
    hasInstantResult,
    hasSmartCliqz,
    newsStoryIndexes,
    hasOtherNews,
  } = results.reduce((info, result, index) => {
    const mainLink = getMainLink(result);
    const type = TYPES.get(MAPPINGS.get(mainLink.template));

    if (mainLink.template === 'news') {
      info.newsStoryIndexes.push(index);
    }

    if ((mainLink.template && mainLink.template.startsWith('entity-news-'))
      || result.links.some(link => link.meta && link.meta.type === 'news')) {
      info.hasOtherNews = true;
    }

    if (mainLink.providers === PROVIDER_INSTANT) {
      info.hasInstantResult = true;
    }

    if (type === TYPE_ONLY_ANSWER || type === TYPE_OVERVIEW) {
      info.hasSmartCliqz = true;
    }

    if (type === TYPE_OVERVIEW) {
      info.supplementaryStart = Math.min(info.supplementaryStart, index);
    }

    if (info[type]) {
      info[type].push(result);
    }

    return info;
  }, {
    overview: [],
    supplementary: [],
    hasInstantResult: false,
    supplementaryStart: Infinity,
    hasSmartCliqz: false,
    newsStoryIndexes: [],
    hasOtherNews: false,
  });

  // Remove News Story results if there is other news
  if (newsStoryIndexes.length && hasOtherNews) {
    newsStoryIndexes.forEach(idx => results.splice(idx, 1));
  }

  const hasTopSupplementaryResult = supplementaryStart === Number(hasInstantResult);

  overview.forEach((result, index) => {
    if (index > 0) {
      result.links = [
        generalizeResult(result, {
          template: 'generic',
        }),
      ];
    }
  });

  supplementary.forEach((result, index) => {
    // We should not show rich content for supplementary results if:
    // this is not the top result OR
    // we already have at least one rich result from more relevant category
    if ((!hasTopSupplementaryResult && hasSmartCliqz) || index > 0) {
      result.links = [
        generalizeResult(result),
      ];
    }
  });
  /* eslint-enable no-param-reassign */

  return {
    ...response,
    results
  };
};
/* eslint-enable */
