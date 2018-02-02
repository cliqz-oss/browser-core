/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import { toBase64, fromBase64 } from '../core/encoding';
import CliqzCrypto from './crypto';
import SecVmUtils from './secvm-utils';
import SecVm from './secvm';
import Storage from '../platform/secvm/storage';

function sampleFromQueryResult(numFeatures, result, resolve, reject) {
  // If the user visits the http and https version only the latter one is
  // kept already at the database level so we don't count hosts twice.
  if (result.length < numFeatures) {
    reject();
    return;
  }

  // the numFeatures randomly sampled entries
  const sampled = [];
  const indicesRemaining = [];
  for (let i = 0; i < result.length; i += 1) {
    indicesRemaining.push(i);
  }
  let numIndicesRemaining = indicesRemaining.length;
  // select a random index, choose the corresponding element from sampled,
  // move the last element of the (theoretically shorter) index array to
  // the position where the chosen index was
  for (let i = 0; i < numFeatures; i += 1) {
    const currIndexIndex = SecVmUtils.getRandomInt(0, numIndicesRemaining);
    const currIndex = indicesRemaining[currIndexIndex];
    sampled.push(result[currIndex]);
    numIndicesRemaining -= 1;
    indicesRemaining[currIndexIndex] = indicesRemaining[numIndicesRemaining];
  }
  resolve(sampled);
}

export default class {
  constructor() {
    // the delimiter for splitting a website title into the words that it is
    // made up of
    this.titleWordsDelimiter = /[?!]$|(?:[?!,.]["']?|["']|)\s+[-—–.·•|&]|\s+[-—–.·•|&]|^["']|["']$|["']\s+|\.\.\.|:\s+|\s+/;
    this.storage = new Storage(SecVm);
    this.storage.init();
  }

  /**
   * Convenience function for using the website titles as features.
   * @param {string} key the key under which one will find the feature vector in
   * the database
   * @param {Number} numFeatures this many features will be used
   * @param {Number} numHashes each string will be hashed numHashes times
   * @param {int} maxTitleWordsPerWebsite the maximum number of words from each
   * website title used as features
   * @return {Promise} will be fulfilled if there are enough features and the
   * saving was successful and rejected otherwise
   */
  createAndSaveFeaturesFromTitleWords(key, numFeatures, numHashes, maxTitleWordsPerWebsite) {
    const that = this;
    return this.retrieveTitleWordsFromHistory(numFeatures, maxTitleWordsPerWebsite).then(features =>
      that.hashAndSaveFeatures(features, numHashes, key)
    );
  }

  /**
   * Convenience function for using the website hosts as features.
   * @param {string} key the key under which one will find the feature vector in
   * the database
   * @param {Number} numFeatures this many features will be used
   * @param {Number} numHashes each string will be hashed numHashes times
   * @return {Promise} will be fulfilled if there are enough features and the
   * saving was successful and rejected otherwise
   */
  createAndSaveFeaturesFromHosts(key, numFeatures, numHashes) {
    const that = this;
    return this.retrieveHostsFromHistory(numFeatures).then(features =>
      that.hashAndSaveFeatures(features, numHashes, key)
    );
  }

  /**
  * @param {int} numFeatures the number of features to be sampled
  * @return {Promise<Array<String>>} an Array of numFeatures unique host names,
  * or reject if there are not enough
  */
  retrieveHostsFromHistory(numFeatures) {
    // the complete result set of the query
    const result = [];
    return new Promise((resolve, reject) => {
      this.storage.retrieveAllHostsFromHistory(
        (row) => {
          result.push(row);
          // somehow has to be wrapped in a function, otherwise:
          // 'TypeError: onThen is not a function  history-manager.js:184:17'
        }
      ).then(() => {
        sampleFromQueryResult(numFeatures, result, resolve, reject);
      });
    });
  }

  /**
  * @param {int} numFeatures the number of features to be sampled
  * @param {int} maxTitleWordsPerWebsite the maximum number of words from each
  * website title used as features
  * @return {Promise<Array<String>>} an Array of numFeatures unique words
  * contained in website titles or reject if there are not enough
  */
  retrieveTitleWordsFromHistory(numFeatures, maxTitleWordsPerWebsite) {
    const that = this;
    // the set of words resulting from splitting up all titles from the result
    // set of the query
    const resultSet = new Set();
    // as resultSet but stored in an array to have indices for the sampling
    const result = [];
    return new Promise((resolve, reject) => {
      this.storage.retrieveAllTitlesFromHistory(
        (row) => {
          if (row != null) {
            // utils.log(row, 'secvm, row: ');
            const words = row.toLowerCase()
              .split(that.titleWordsDelimiter, maxTitleWordsPerWebsite);
            // utils.log(words, 'secvm, words: ');
            words.forEach((word) => {
              if (!(resultSet.has(word) || word === '')) {
                // TODO: Somehow dashes still go unnoticed by the regexp and
                // even when trying to filter them out with word === '–' they
                // aren't caught.
                resultSet.add(word);
                result.push(word);
              }
            });
          }
        }
      ).then(() => {
        // somehow has to be wrapped in a function, otherwise:
        // 'TypeError: onThen is not a function  history-manager.js:184:17'
        sampleFromQueryResult(numFeatures, result, resolve, reject);
      });
    });
  }

  /**
   * @param {Array<string>} features an array of the strings to be hashed
   * @param {Number} numHashes each string will be hashed numHashes times
   * @return {Promise<Uint32Array>} a promise with the strings hashed to Uint32
   */
  hashFeatures(features, numHashes) {
    const numHashedFeatures = features.length * numHashes;
    const hashes = new Uint32Array(numHashedFeatures);
    const promises = new Array(numHashedFeatures);
    for (let i = 0; i < numHashedFeatures; i += 1) {
      promises[i] =
        // append 0, 1, ..., numHashes - 1 to each string
        CliqzCrypto.sha256(features[Math.floor(i / numHashes)] + (i % numHashes))
          .then((hashedStr) => {
            hashes[i] = CliqzCrypto.toUint32(hashedStr);
          });
    }

    return new Promise(resolve =>
      Promise.all(promises).then(() =>
        resolve(hashes)
      )
    );
  }

  /**
   * @param {Array<string>} features the array of features to be stored
   * @param {Number} numHashes each string will be hashed numHashes times
   * @param {string} key the key under which one will find the feature vector in
   * the database
   * @return {Promise} will be fulfilled if the saving was successful and
   * rejected otherwise
   */
  hashAndSaveFeatures(features, numHashes, key) {
    const that = this;
    return this.hashFeatures(features, numHashes).then(hashes =>
      that.storage.saveFeatureVector(key, toBase64(new Uint8Array(hashes.buffer)))
    );
  }

  /**
   * @param {String} key the key of the features to be removed from the
   * database
   * @return {Promise} will be fulfilled if the removal was successful and
   * rejected otherwise
   */
  removeHashedFeatures(key) {
    return this.storage.deleteFeatureVector(key);
  }

  /**
   * @param {String} key the key of the hashed features to be obtained from the
   * database
   * @return {Promise<Uint32Array>} will be fulfilled with the array of the
   * hashed features
   */
  getHashedFeatures(key) {
    return this.storage.loadFeatureVector(key).then(base64Vector =>
      new Uint32Array(fromBase64(base64Vector).buffer)
    );
  }
}
