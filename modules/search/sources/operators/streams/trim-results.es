/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';
import { getMainLink } from '../normalize';
import { PREVENT_AUTOCOMPLETE_KEYS } from '../../consts';

// TODO: add tests

/**
 * Factory for the `trimResults` operator, which removes the 'instant' result
 * if the second result can be autocompleted.
 *
 * @function trimResults
 */
export default () =>
  pipe(map(({
    query,
    responses: [firstResponse, ...remainingResponses],
    ...result
  }) => {
    // TODO: verify logic (at the moment, `merge-results` makes sure that
    //       there is always one response)
    let trimmedResults = firstResponse.results.concat();
    const shouldKeepInstantResult = PREVENT_AUTOCOMPLETE_KEYS.includes(query.keyCode);
    const { isBlockingAdult, isAskingForAdult } = query.assistantStates.adult;

    // Remove instant result(s) if autocompletable result comes right after it
    let lastIndexOfInstantResult = -1;
    for (let i = 0; i < trimmedResults.length; i += 1) {
      if (getMainLink(trimmedResults[i]).provider === 'instant') {
        lastIndexOfInstantResult = i;
      } else { // Do not continue if the first result(s) is not instant result
        break;
      }
    }

    if (lastIndexOfInstantResult > -1 && (trimmedResults.length > lastIndexOfInstantResult + 1)) {
      const nextResult = getMainLink(trimmedResults[lastIndexOfInstantResult + 1]);
      const nextResultIsAutocompletable = nextResult.meta.completion
        || nextResult.url === nextResult.text;
      const nextResultIsNotAdult = !nextResult.extra || !nextResult.extra.adult;
      const shouldShowAdultResults = !isBlockingAdult && !isAskingForAdult;

      if (nextResultIsAutocompletable && !shouldKeepInstantResult
        && (nextResultIsNotAdult || shouldShowAdultResults)) {
        trimmedResults = trimmedResults.filter(res => getMainLink(res).provider !== 'instant');
      }
    }

    return {
      // TODO: keep spread all?
      ...result,
      query,
      responses: [
        {
          // TODO: keep spread all?
          ...firstResponse,
          results: trimmedResults,
        },
        ...remainingResponses,
      ],
    };
  }));
