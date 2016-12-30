import { utils } from 'core/cliqz';

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/FileUtils.jsm');

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

var nsIAO = Components.interfaces.nsIHttpActivityObserver;
var nsIHttpChannel = Components.interfaces.nsIHttpChannel;

function _log(msg){
    try {
        if(CliqzMonComp.debug) {
            CliqzUtils.log(msg, CliqzMonComp.LOG_KEY);
        }
    }
    catch(e) {
      CliqzUtils.log(e, CliqzMonComp.LOG_KEY)
    };
}

var CliqzMonComp = {
    VERSION: '0.1',
    LOG_KEY: 'moncomp',
    debug: true,
    init: function(window) {
      if (!CliqzUtils.mc) CliqzUtils.mc = CliqzMonComp;
    }
}

export default CliqzMonComp;
