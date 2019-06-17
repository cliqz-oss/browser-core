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
      const nextResultIsAutocompletable = getMainLink(trimmedResults[lastIndexOfInstantResult + 1])
        .meta.completion;

      if (nextResultIsAutocompletable && !shouldKeepInstantResult) {
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
