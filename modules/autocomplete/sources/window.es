import autocomplete from "autocomplete/autocomplete";
import { utils, environment } from "core/cliqz";
import Search from "autocomplete/search";
import {Window as AutocompleteWindow} from "platform/auto-complete-component";


export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    utils.log('-- INITIALIAZING WINDOW ---', 'DEBUG');
    AutocompleteWindow.init(this.window);
    utils.log('-- INITIALIAZED WINDOW ---', 'DEBUG');
  }

  unload() {
    AutocompleteWindow.unload(this.window)
  }

  status() {
    return {
      visible: true,
      state: autocomplete.CliqzResultProviders.getSearchEngines(),
      supportedIndexCountries: autocomplete.CliqzSearchCountryProviders.getProviders()
    }
  }
}
