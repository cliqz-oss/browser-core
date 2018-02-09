/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import background from '../core/base/background';
import SecVm from './secvm';
import utils from '../core/utils';
import inject from '../core/kord/inject';

/**
* @namespace secvm
* @class Background
*/
export default background({

  // Need to check against a pref, before enabling the module.
  // This will be controlled from ABTests. By default enable for all.
  hpn: inject.module('hpn'),

  enableModule() {
    return utils.getPref('experiment_svm', false);
  },

  /**
  * @method init
  */
  // init(settings) {
  init() {
    this.svm = SecVm;
    if (this.enableModule()) {
      SecVm.hpn = this.hpn;
      this.enabled = true;
      SecVm.initAtBrowser();
    } else {
      this.enabled = false;
    }
  },

  unload() {
    if (this.enabled) {
      if (utils.getPref('experiment_svm') === undefined) {
        // If experiment is no longer running, we need to remove the DB.
        SecVm.storage.removeDB();
      }

      SecVm.unloadAtBrowser();
      SecVm.unload();
      this.enabled = false;
    }
  },
  beforeBrowserShutdown() {
    if (this.enabled) {
      SecVm.unload();
    }
  },

  actions: {
    label(label) {
      let label01 = label;
      if (label === 1 || label === 2) {
        if (label === 2) {
          // we need -1 and 1 for the SVM
          label01 = -1;
        }
        // only add the database entry if it's not already there
        SecVm.labelSet.getLabelSetProperty('label').then(null, () => {
          SecVm.labelSet.saveLabelSetProperty('label', label01).then(() => {
            SecVm.label = label01;
          });
        });
      }
    }
  }
});
