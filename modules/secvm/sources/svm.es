/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

export default class Svm {
  /**
   * @param {Uint32Array} features the hashed feature vector
   * @param {Array<float> or Float32Array} weights the weight vector
   * @param {int} trueLabel the user's true label
   */
  constructor(features, weights, trueLabel) {
    this.numBins = weights.length - 1;
    this.featuresBinned = new Map();
    for (const feature of features) {
      const featureBinned = feature % this.numBins;
      const count = this.featuresBinned.get(featureBinned);
      if (count) {
        this.featuresBinned.set(featureBinned, count + 1);
      } else {
        this.featuresBinned.set(featureBinned, 1);
      }
    }

    this.weights = weights;
    this.trueLabel = trueLabel;
    this.dotProduct = this.computeDotProduct(this.featuresBinned, this.weights);
  }

  /**
   * @return {boolean} true if the prediction was correct, false otherwise
   */
  test() {
    return this._test(this.dotProduct, this.trueLabel);
  }

  /**
  * @return {Map<int, int>} <index, count> the user dependet part of the SVM
  * gradient but still without sign (i.e. not yet multiplied with trueLabel)
  */
  computeMaxPartOfGradient() {
    return this._computeMaxPartOfGradient(
      this.featuresBinned, this.numBins, this.dotProduct, this.trueLabel);
  }

  /**
   * @param {float} dotProduct the dot product of a feature and a weight vector
   * @param {int} trueLabel the user's true label
   * @return {boolean} true if the prediction was correct, false otherwise
   */
  _test(dotProduct, trueLabel) {
    // if the feature vector lies on the hyperplane, we predict 1
    if (dotProduct === 0 && trueLabel === 1) {
      return true;
    }
    return dotProduct * trueLabel > 0;
  }

  /**
  * @param {Map<int, int>} features the binned feature vector
  * @param {int} numBins the number of bins the features have been hashed into
  * @param {float} dotProduct the dot product of the feature vector and a weight
  * vector
  * @param {int} trueLabel the user's true label
  * @return {Map<int, int>} <index, count> the user dependet part of the SVM
  * gradient but still without sign (i.e. not yet multiplied with trueLabel)
  */
  _computeMaxPartOfGradient(features, numBins, dotProduct, trueLabel) {
    const signedProduct = trueLabel * dotProduct;
    if (signedProduct > 1) {
      return new Map();
    }

    const featuresAndBias = new Map(features);
    // the bias term
    featuresAndBias.set(numBins, 1);

    return featuresAndBias;
  }

  /**
   * Computes the dot product between a weight vector and a binned feature
   * vector.
   * @param {Map<int, int>} features the binned feature vector
   * @param {Float32Array} weights the weight vector
   * @return {float} the dot product
   */
  computeDotProduct(features, weights) {
    // the bias term is always added
    let product = weights[weights.length - 1];
    for (const [index, count] of features.entries()) {
      product += weights[index] * count;
    }

    return product;
  }
}
