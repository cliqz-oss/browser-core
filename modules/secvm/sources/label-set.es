/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import Storage from '../platform/secvm/storage';
import SecVm from './secvm';

export default class {

  constructor() {
    this.storage = new Storage(SecVm);
    this.storage.init();
  }

  /**
   * @param {string} property the name of the labelSet property
   * @param {boolean} value the value of the labelSet property to be stored
   * @return {Promise} will be fulfilled if the saving was successful and
   * rejected otherwise
   */
  saveLabelSetProperty(property, value) {
    return this.storage.saveLabelSetProperty(property, value);
  }

  /**
   * @param {String} property the name of the labelSet property to be removed
   * from the database
   * @return {Promise} will be fulfilled if the removal was successful and
   * rejected otherwise
   */
  removeLabelSetProperty(property) {
    return this.storage.deleteLabelSetProperty(property);
  }

  /**
   * @param {String} property the name of the property to be obtained from the
   * database
   * @return {Promise<int>} will be fulfilled with the value of the property
   */
  getLabelSetProperty(property) {
    return this.storage.loadLabelSetProperty(property);
  }
}
