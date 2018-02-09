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
   * Rolls a (biased) n-sided die.
   * @param {Array<float>} probabilities The probabilities for the sides of the
   * (biased) die. They must add up to 1.
   * @return {int} the outcome of the dice roll.
   */
  roll(probabilities) {
    // 1 - prob(0, 1, ..., i - 1 are not selected)
    let remainingProbability = 1;
    // if 0, ..., probabilities.length - 2 aren't selected, we will explicitely
    // select end to avoid not selecting any outcome due to float inaccuracies
    const end = probabilities.length - 1;
    for (let i = 0; i < end; i += 1) {
      // prob(select i | 0, 1, ..., i - 1 were not selected)
      const currConditionalProbability = probabilities[i] / remainingProbability;
      if (Math.random() < currConditionalProbability) {
        return i;
      }
      remainingProbability -= probabilities[i];
    }
    return end;
  }

  /**
   * Convenience function for rolling a die and saving the outcome.
   * @param {string} key the key under which one will find the dice roll in the
   * database
   * @param {Array<float>} probabilities The probabilities for the sides of the
   * (biased) die. They must add up to 1.
   * @return {Promise} will be fulfilled if the saving was successful and
   * rejected otherwise
   */
  rollDiceAndSaveOutcome(key, probabilities) {
    return this.saveDiceRoll(key, this.roll(probabilities));
  }

  /**
   * @param {string} key the key under which one will find the dice roll in the
   * database
   * @param {int} outcome the outcome of the dice roll to be stored
   * @return {Promise} will be fulfilled if the saving was successful and
   * rejected otherwise
   */
  saveDiceRoll(key, outcome) {
    return this.storage.saveDiceRoll(key, outcome);
  }

  /**
   * @param {String} key the key of the dice roll to be removed from the
   * database
   * @return {Promise} will be fulfilled if the removal was successful and
   * rejected otherwise
   */
  removeDiceRoll(key) {
    return this.storage.deleteDiceRoll(key);
  }

  /**
   * @param {String} key the key of the dice roll to be obtained from the
   * database
   * @return {Promise<int>} will be fulfilled with the outcome of the dice roll
   */
  getDiceRoll(key) {
    return this.storage.loadDiceRoll(key);
  }
}
