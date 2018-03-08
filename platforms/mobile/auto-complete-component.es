import Search from "../autocomplete/search";
import utils from "../core/utils";
import autocomplete from "../autocomplete/autocomplete"

export let background = {
  init() { },
  unload() {}
};
export let Window = {
    init(window) {
      window.CliqzAutocomplete = autocomplete;
      window.Search = Search;
    },
    unload(window) {}
}
