/* eslint no-param-reassign: 'off' */

import Search from '../autocomplete/search';
import autocomplete from '../autocomplete/autocomplete';

export const background = {
  init() { },
  unload() {}
};
export const Window = {
  init(window) {
    window.CliqzAutocomplete = autocomplete;
    window.Search = Search;
  },
  unload() {}
};
