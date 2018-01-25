/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import utils from '../core/utils';
import LabelSet from './label-set';
import Features from './features';
import DiceRolls from './dice-rolls';
import Svm from './svm';
import SecVmUtils from './secvm-utils';
import Network from './network';
import Storage from '../platform/secvm/storage';

const SecVm = {
  VERSION: '0.1',
  DB_NAME: 'cliqz.secvm1',
  WAIT_TIME: 2000,
  LOG_KEY: 'secvm',
  CLIQZ_SERVER: 'https://secvm.cliqz.com',
  debug: false,
  label: null,
  storage: null,
  fetchConfigurationId: null,
  // a LabelSet instance for the background script to check if the label is
  // already stored and to store it otherwise
  labelSet: null,
  // the current configuration file (JSON) can be found here
  CONFIGURATION_URL: 'https://svm.cliqz.com/configuration.json',
  // the server that collects the SVM updates and test results
  SVM_SERVER: 'https://svm.cliqz.com',
  // the length (in Base64 characters) of the id that is used to filter out
  // duplicate packages
  PACKAGE_ID_LENGTH: 11,
  // the maximum number of words from a single website title that is used as
  // features
  MAX_TITLE_WORDS_PER_WEBSITE: 10,
  // the ids of experiments that have already been conducted and can therefore
  // be ignored if seen in a configuration file again
  experimentIdsAlreadyConducted: null,
  // busy with computing and sending updates, don't fetch a new configuration
  // file
  workingOnUpdates: false,

  log(msg) {
    utils.log(msg, SecVm.LOG_KEY);
  },

  fetchConfiguration() {
    if (SecVm.workingOnUpdates || !SecVm.label) {
      return;
    }
    SecVm.workingOnUpdates = true;

    Network.getObjectFromJsonWebsite(SecVm.CONFIGURATION_URL).then((configuration) => {
      SecVm.handleConfiguration(configuration).then((configData) => {
        const configDataWithoutPromises = configData[0];

        const svms = SecVm.createSvms(configDataWithoutPromises);

        SecVm.sendExperimentData(configDataWithoutPromises, svms);
      }, () => {
        if (SecVm.debug) {
          SecVm.log('at least one promise was rejected');
        }
        SecVm.workingOnUpdates = false;
      });
    }, () => {
      SecVm.workingOnUpdates = false;
      if (SecVm.debug) {
        SecVm.log('error retrieving data');
      }
    });
  },

  /**
   * Follows the instructions given by the configuration object to prepare the
   * participation in the experiments.
   * @param {Object} configuration a configuration object obtained from a CLIQZ
   * server
   * @return {Promise<Array>} Will be fulfilled once all the steps necessary for
   * participating in the experiments have been taken. The first entry of the
   * returned object contains all the data necessary for conducting the
   * experiments. For details see the beginning of the function.
   */
  handleConfiguration(configuration) {
    // int the number of experiments being currently run
    const numExperiments = configuration.timeLeft.length;
    // Array<{svmId: int, iteration: int}> the experiments' ids
    const experimentIds = Array(numExperiments).fill(0);
    // Array<int> the deadlines for the experiments w.r.t. the local clock
    const deadlines = Array(numExperiments).fill(0);
    // Array<Float32Array> the weight vectors for the experiments
    const weightVectors = Array(numExperiments).fill(0);
    // Array{hosts: Uint32Array, titleWords: Uint32Array}
    // the feature vectors for the current experiments
    const featureVectors = Array(numExperiments).fill(0);
    // Array<boolean> whether the user is part of the train set for the i-th
    // experiment
    const partOfTrainSet = Array(numExperiments).fill(0);
    // Array<boolean> whether the user is part of the test set for the i-th
    // experiment
    const partOfTestSet = Array(numExperiments).fill(0);
    const dataPromises = [];

    for (let i = 0; i < numExperiments; i += 1) {
      const currExperimentId = configuration.experimentId[i];
      // make sure we haven't already conducted this experiment
      if (!SecVm.experimentIdsAlreadyConducted.has(currExperimentId)) {
        SecVm.experimentIdsAlreadyConducted.add(currExperimentId);
        SecVm.storage.addExperimentId(currExperimentId);
        experimentIds[i] = currExperimentId;

        deadlines[i] = Date.now() + configuration.timeLeft[i];

        featureVectors[i] = {};

        const idHosts = configuration.features[i].idHosts;
        if (idHosts) {
          dataPromises.push(
            SecVm.featureHandler.getHashedFeatures(idHosts).then((featureVector) => {
              // the feature vector has already been computed before
              featureVectors[i].hosts = featureVector;
            }, function () {
              // the feature vector needs to be newly created
              return SecVm.featureHandler.createAndSaveFeaturesFromHosts(
                idHosts,
                configuration.features[i].numHosts,
                configuration.features[i].numHashesHosts).then(() => {
                  return SecVm.featureHandler.getHashedFeatures(idHosts).then((featureVector) => {
                    SecVm.featureVectors[i].hosts = featureVector;
                  });
                });
            }));
        }

        const idTitleWords = configuration.features[i].idTitleWords;
        if (idTitleWords) {
          dataPromises.push(SecVm.featureHandler.getHashedFeatures(idTitleWords)
            .then((featureVector) => {
              // the feature vector has already been computed before
              featureVectors[i].titleWords = featureVector;
            }, () => {
              return SecVm.featureHandler.createAndSaveFeaturesFromTitleWords(
                idTitleWords,
                configuration.features[i].numTitleWords,
                configuration.features[i].numHashesTitleWords,
                SecVm.MAX_TITLE_WORDS_PER_WEBSITE).then(() => {
                  // the feature vector needs to be newly created
                  return SecVm.featureHandler.getHashedFeatures(idTitleWords)
                    .then((featureVector) => {
                      featureVectors[i].titleWords = featureVector;
                    });
                });
            }));
        }

        const idDiceRoll = configuration.diceRolls[i].id;
        let trainOutcomes = configuration.diceRolls[i].train;
        if (!trainOutcomes) {
          trainOutcomes = [];
        }
        let testOutcomes = configuration.diceRolls[i].test;
        if (!testOutcomes) {
          testOutcomes = [];
        }
        dataPromises.push(SecVm.diceRollsHandler.getDiceRoll(idDiceRoll)
          .then((outcomeString) => {
            const outcome = parseInt(outcomeString, 10);
            if (trainOutcomes.indexOf(outcome) !== -1) {
              partOfTrainSet[i] = true;
            } else {
              partOfTrainSet[i] = false;
            }
            if (testOutcomes.indexOf(outcome) !== -1) {
              partOfTestSet[i] = true;
            } else {
              partOfTestSet[i] = false;
            }
          }, () => (
            SecVm.diceRollsHandler
              .rollDiceAndSaveOutcome(idDiceRoll, configuration.diceRolls[i].probs).then(() => {
                return SecVm.diceRollsHandler.getDiceRoll(idDiceRoll).then((outcomeString) => {
                  const outcome = parseInt(outcomeString, 10);
                  if (trainOutcomes.indexOf(outcome) !== -1) {
                    partOfTrainSet[i] = true;
                  } else {
                    partOfTrainSet[i] = false;
                  }
                  if (testOutcomes.indexOf(outcome) !== -1) {
                    partOfTestSet[i] = true;
                  } else {
                    partOfTestSet[i] = false;
                  }
                });
              })
          )));
      }
    }

    const configDataPromise = Promise.all(dataPromises).then(() => {
      const weightPromises = [{
        numExperiments,
        experimentIds,
        deadlines,
        weightVectors,
        featureVectors,
        partOfTrainSet,
        partOfTestSet
      }];
      for (let i = 0; i < numExperiments; i += 1) {
        if (partOfTrainSet[i] || partOfTestSet[i]) {
          weightPromises.push(Network.getWeightVector(configuration.weightVectorUrl[i])
            .then((weightVector) => {
              weightVectors[i] = weightVector;
            }));
        }
      }
      return Promise.all(weightPromises);
    });

    if (configuration.featuresToDelete) {
      for (let i = 0; i < configuration.featuresToDelete.length; i += 1) {
        SecVm.featureHandler.removeHashedFeatures(configuration.featuresToDelete[i]);
      }
    }

    return configDataPromise;
  },

  /**
   * Creates Svm instances from the feature vectors and weight vectors contained
   * in configData.
   * @param {Object} configData an object as returned by handleConfiguration
   * containing the data necessary to conduct the current experiments
   * @return {Array<Svm>} an array containing the Svms constructed from the
   * feature vectors and weight vectors contained in configData
   */
  createSvms(configData) {
    const svms = new Array(configData.featureVectors.length);
    for (let i = 0; i < configData.featureVectors.length; i += 1) {
      // if this doesn't hold, we don't need the svm since not data will be sent later on
      if (configData.partOfTrainSet[i] || configData.partOfTestSet[i]) {
        const currFeatureVectors = configData.featureVectors[i];
        const currWeights = configData.weightVectors[i];
        const currSvms = {};
        svms[i] = currSvms;
        if (currFeatureVectors.hosts) {
          if (currFeatureVectors.titleWords) {
            // we can't use concat() because we are working on Float32Arrays
            const mergedFeatures =
              new Array(currFeatureVectors.hosts.length + currFeatureVectors.titleWords.length);
            const endFirstLoop = currFeatureVectors.hosts.length;
            for (let j = 0; j < endFirstLoop; j += 1) {
              mergedFeatures[j] = currFeatureVectors.hosts[j];
            }
            for (let j = 0; j < currFeatureVectors.titleWords.length; j += 1) {
              mergedFeatures[j + endFirstLoop] = currFeatureVectors.titleWords[j];
            }
            svms[i] = new Svm(mergedFeatures, currWeights, SecVm.label);
          } else {
            svms[i] = new Svm(currFeatureVectors.hosts, currWeights, SecVm.label);
          }
        } else {
          svms[i] = new Svm(currFeatureVectors.titleWords, currWeights, SecVm.label);
        }
      }
    }

    return svms;
  },

  sendExperimentData(configData, svms) {
    // as it will be sent via JSON
    const label01 = SecVm.label === -1 ? 0 : 1;

    for (let i = 0; i < configData.numExperiments; i += 1) {
      const currSvm = svms[i];

      if (configData.partOfTestSet[i]) {
        const toSend = {};
        // experimentId
        toSend.e = [configData.experimentIds[i].svmId, configData.experimentIds[i].iteration];
        // packageId
        toSend.p = SecVmUtils.getRandomBase64String(SecVm.PACKAGE_ID_LENGTH);
        // trueLabel
        toSend.l = label01;
        // svmLabel
        toSend.s = currSvm.test() ? toSend.l : 1 - toSend.l;

        Network.sendJsonPackage(toSend, SecVm.SVM_SERVER);
      }

      if (configData.partOfTrainSet[i]) {
        const currDeadline = configData.deadlines[i];
        const toSendBase = {};
        // experimentId
        toSendBase.e = [configData.experimentIds[i].svmId, configData.experimentIds[i].iteration];
        // value
        toSendBase.v = label01;

        const participationNotification = {};
        participationNotification.e = toSendBase.e;
        // packageId
        participationNotification.p = SecVmUtils
          .getRandomBase64String(SecVm.PACKAGE_ID_LENGTH);
        Network.sendJsonPackage(participationNotification, SecVm.SVM_SERVER);

        const indices = currSvm.computeMaxPartOfGradient();
        // indices is empty if the feature vector lies on the correct side
        // of the hyperplane outside of the margin so no 0-updates get sent
        for (const [index, count] of indices) {
          for (let j = 0; j < count; j += 1) {
            const toSend = {};
            toSend.e = toSendBase.e;
            toSend.v = toSendBase.v;

            // packageId
            toSend.p = SecVmUtils.getRandomBase64String(SecVm.PACKAGE_ID_LENGTH);
            // index
            toSend.i = index;

            setTimeout(() => {
              Network.sendJsonPackage(toSend, SecVm.SVM_SERVER);
            },
              Math.random() * (currDeadline - Date.now())
            );
          }
        }
      }
    }
  },

  init() {

  },

  initAtBrowser() {
    // Because we need to only initialize the listener once on extension load.

    utils.ts1 = this;

    SecVm.labelSet = new LabelSet();
    SecVm.labelSet.getLabelSetProperty('label').then((label) => {
      SecVm.label = label;
    });

    SecVm.featureHandler = new Features();
    SecVm.diceRollsHandler = new DiceRolls();

    if (!SecVm.storage) {
      SecVm.storage = new Storage(SecVm);
      SecVm.storage.init();
      SecVm.storage.loadExperimentIds().then((ids) => {
        SecVm.experimentIdsAlreadyConducted = ids;
        // TODO: remove this line for production
        SecVm.experimentIdsAlreadyConducted = new Set();

        if (SecVm.fetchConfigurationId == null) {
          SecVm.fetchConfigurationId =
            utils.setInterval(SecVm.fetchConfiguration, 600000, null);
        }
      });
    }
  },

  unload() {
    utils.clearTimeout(SecVm.fetchConfigurationId);
  },

  unloadAtBrowser() {

  }
};

export default SecVm;
