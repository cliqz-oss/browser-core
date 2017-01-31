import background from 'offers/background';
import LoggingHandler from 'offers/logging_handler';
import OffersConfigs from 'offers/offers_configs';
import {utils} from 'core/cliqz';



////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'window';


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
export default class {
  constructor(settings) {
    // check if we have the feature  enabled
    if (!utils.getPref('grFeatureEnabled', false)) {
      return;
    }
    this.window = settings.window;
    this.settings = settings.settings;
    // GR-117 -> check comment below in init()
    this.tabsProgressListener = null;
  }

  init() {
    // check if we have the feature  enabled
    if (!utils.getPref('grFeatureEnabled', false)) {
      return;
    }

    // EX-2561: private mode then we don't do anything here
    if (utils.isPrivate(this.window)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'we are in private mode, avoid any logic here');
      return;
    }

  }

  unload() {

  }
}
