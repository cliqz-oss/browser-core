import { getMainLink } from '../normalize';
import Rx from '../../../platform/lib/rxjs';

const { map } = Rx.operators;

const PREVENT_AUTOCOMPLETE_KEYS = ['Backspace', 'Delete'];

// TODO: add tests

/**
 * Factory for the `trimResults` operator, which removes the 'instant' result
 * if the second result can be autocompleted.
 *
 * @function trimResults
 */
export default () =>
  map(({
    query,
    responses: [firstResponse, ...remainingResponses],
    ...result
  }) => {
    // TODO: verify logic (at the moment, `merge-results` makes sure that
    //       there is always one response)
    const trimmedResults = firstResponse.results.concat();
    const shouldKeepInstantResult = PREVENT_AUTOCOMPLETE_KEYS.includes(query.keyCode);

    // Remove instant result if the first result is autocompletable
    const [firstResult, secondResult] = trimmedResults;
    if (!firstResult || !secondResult || shouldKeepInstantResult || getMainLink(firstResult).provider !== 'instant') {
      // just keep results
    } else if (getMainLink(secondResult).meta.completion) {
      trimmedResults.splice(0, 1);
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
  });
