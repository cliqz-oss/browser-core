import background from "core/base/background";
import ExpansionsProvider from "expansions-provider/expansions-provider";
import utils from 'core/utils'

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  enabled() {
    return true;
  },

  /**
    @method init
    @param settings
  */
  init(settings) {
    this.expansionsProvider = new ExpansionsProvider();
    if (utils.getPref('expansion_fallback', false)) {
      this.expansionsProvider.enable();
    } else {
      this.expansionsProvider.disable();
    }
  },

  unload() {
    this.expansionsProvider.disable();
  },

  beforeBrowserShutdown() {

  },

  actions: {

  }
});
