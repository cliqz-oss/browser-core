import autocomplete from "./autocomplete";
import { utils, environment } from "../core/cliqz";
import Search from "./search";
import {Window as AutocompleteWindow} from "../platform/auto-complete-component";


export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    AutocompleteWindow.init(this.window);
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
