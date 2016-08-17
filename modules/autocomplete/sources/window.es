import autocomplete from "autocomplete/autocomplete";
import CliqzResultProviders from "autocomplete/result-providers";
import { utils } from "core/cliqz";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    this.window.CliqzAutocomplete = autocomplete;
  }

  unload() {
    delete this.window.CliqzAutocomplete;
  }

  createButtonItem() {
    if (utils.getPref("cliqz_core_disabled", false)) return;

    const doc = this.window.document,
      menu = doc.createElement('menu'),
      menupopup = doc.createElement('menupopup'),
      engines = CliqzResultProviders.getSearchEngines(),
      def = Services.search.currentEngine.name;

    menu.setAttribute('label', utils.getLocalizedString('btnDefaultSearchEngine'));

    for(var i in engines){

      var engine = engines[i],
      item = doc.createElement('menuitem');
      item.setAttribute('label', '[' + engine.prefix + '] ' + engine.name);
      item.setAttribute('class', 'menuitem-iconic');
      item.engineName = engine.name;
      if(engine.name == def){
        item.style.listStyleImage = 'url(' + utils.SKIN_PATH + 'checkmark.png)';
      }
      // TODO: Where is this listener removed?
      item.addEventListener('command', (function(event) {
        CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
        utils.telemetry({
          type: 'activity',
          action: 'cliqz_menu_button',
          button_name: 'search_engine_change_' + event.currentTarget.engineName
        });
      }).bind(this), false);

      menupopup.appendChild(item);
    }

    menu.appendChild(menupopup);

    return menu;
  }
}
