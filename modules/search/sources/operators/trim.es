import { getMainLink } from './normalize';

const PREVENT_AUTOCOMPLETE_KEYS = ['Backspace', 'Delete'];

/*
 * Trims list of results by removing the instant results if the first result
 * thereafter is autocompletable.
 *
 * @param {Object[]} results - The list of results.
 */
const trim = (response) => {
  const trimmed = response.results.concat();
  const shouldKeepInstantResult = PREVENT_AUTOCOMPLETE_KEYS.includes(response.params.keyCode);

  // Remove instant result if the first result is autocompletable
  const [first, second] = trimmed;
  if (!first || !second || shouldKeepInstantResult || getMainLink(first).provider !== 'instant') {
    return trimmed;
  }

  if (getMainLink(second).meta.completion) {
    trimmed.splice(0, 1);
  }

  return trimmed;
};

export default response => ({
  ...response,
  results: trim(response),
});
