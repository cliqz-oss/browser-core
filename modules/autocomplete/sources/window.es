import autocomplete from "./autocomplete";
import { utils, environment } from "../core/cliqz";
import Search from "./search";
import {Window as AutocompleteWindow} from "../platform/auto-complete-component";


export default class Win {
  constructor(settings) {
    this.window = settings.window;
    this.window.CliqzAutocomplete = autocomplete;
  }

  init() {
    AutocompleteWindow.init(this.window);
  }

  unload() {
    AutocompleteWindow.unload(this.window)
    delete this.window.CliqzAutocomplete;
  }

  status() {
    var engines = [];
    // CliqzResultProviders might be uninitialized
    if(autocomplete.CliqzResultProviders){
      engines = autocomplete.CliqzResultProviders.getSearchEngines();
    }
    return {
      visible: true,
      state: engines,
      supportedIndexCountries: autocomplete.CliqzSearchCountryProviders.getProviders()
    }
  }
}
