import { utils } from '../core/cliqz';
import { Components, Services, XPCOMUtils } from '../platform/globals';

Components.utils.import('resource://gre/modules/FileUtils.jsm');

var nsIAO = Components.interfaces.nsIHttpActivityObserver;
var nsIHttpChannel = Components.interfaces.nsIHttpChannel;

function _log(msg){
    try {
        if(CliqzMonComp.debug) {
            utils.log(msg, CliqzMonComp.LOG_KEY);
        }
    }
    catch(e) {
      utils.log(e, CliqzMonComp.LOG_KEY)
    };
}

var CliqzMonComp = {
    VERSION: '0.1',
    LOG_KEY: 'moncomp',
    debug: true,
    init: function(window) {
      if (!utils.mc) utils.mc = CliqzMonComp;
    }
}

export default CliqzMonComp;
