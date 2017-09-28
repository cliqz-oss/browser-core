import global from 'global';
import { Services } from '../globals';

const context = {
  window: global,
};

const rxjsUrl = 'chrome://cliqz/content/bower_components/Rx.min/index.js';

Services.scriptloader.loadSubScriptWithOptions(rxjsUrl, { target: context });

export default context.Rx;
