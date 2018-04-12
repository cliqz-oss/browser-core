import { getMainLink } from './normalize';

/*
 * Trims list of results by removing the instant results if the first result
 * thereafter is autocompletable.
 *
 * @param {Object[]} results - The list of results.
 */
const trim = (results) => {
  const [first, second, ...rest] = results;
  if (!first || getMainLink(first).provider !== 'instant') {
    return results;
  }

  if (!second) {
    return results;
  }

  if (getMainLink(second).meta.isAutocompletable) {
    return [second, ...rest];
  }

  return results;
};

const PREVENT_AUTOCOMPLETE_KEYS = ['Backspace', 'Delete'];

export default (response) => {
  const shouldKeepInstantResult = PREVENT_AUTOCOMPLETE_KEYS.includes(response.params.keyCode);

  if (shouldKeepInstantResult) {
    return response;
  }

  return {
    ...response,
    results: trim(response.results),
  };
};
