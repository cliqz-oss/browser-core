/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import HistoryManager from '../../core/history-manager';
import getDbConn, { remove } from '../../platform/sqlite';
import DatabaseEnum from '../../secvm/database-enum';


/**
 * Wraps Promises around the database callback API.
 */
export default class Storage {
  constructor(secVm) {
    this.secVm = secVm;
    this.dbName = secVm.DB_NAME;
    this.dbConn = null;
  }

  init() {
    this.dbConn = getDbConn(this.dbName);
    this.createTable();

    return this.dbConn;
  }

  // Ensuring the dbConn is not null.
  ensureConnection() {
    this.getDBConn();
  }

  getDBConn() {
    return this.dbConn || this.init();
  }

  removeDB() {
    remove(this.dbName);
  }
  /**
   * Puts a feature vector into the DB.
   * @param {string} id a unique id for this feature vector
   * @param {string} vector the feature vector converted to a string
   * @return {Promise} will be fulfilled if the insertion was successful and
   * rejected otherwise
   */
  saveFeatureVector(id, vector) {
    return this.insert2tupleIntoDb(id, vector, DatabaseEnum.HASHED_FEATURE_VECTORS);
  }

  /**
   * Removes a feature vector from the DB.
   * @param {string} id the id of the feature vector to be removed
   * @return {Promise} will be fulfilled if the removal was successful and
   * rejected otherwise
   */
  deleteFeatureVector(id) {
    return this.delete2tupleFromDb(id, DatabaseEnum.HASHED_FEATURE_VECTORS);
  }

  /**
   * Loads a feature vector from the DB.
   * @param {string} id the id of the feature vector to be obtained
   * @return {Promise<string>} will be fulfilled with the string representation of the
   * requested feature vector
   */
  loadFeatureVector(id) {
    return this.load2tupleFromDb(id, DatabaseEnum.HASHED_FEATURE_VECTORS);
  }


  /**
   * Puts the result of a dice roll into the DB.
   * @param {string} id a unique id for this dice roll
   * @param {int} data the outcome of the dice roll
   * @return {Promise} will be fulfilled if the insertion was successful and
   * rejected otherwise
   */
  saveDiceRoll(id, outcome) {
    return this.insert2tupleIntoDb(id, outcome, DatabaseEnum.DICE_ROLLS);
  }

  /**
   * Removes the result of a dice roll from the DB.
   * @param {string} id the id of the dice roll to be removed
   * @return {Promise} will be fulfilled if the removal was successful and
   * rejected otherwise
   */
  deleteDiceRoll(id) {
    return this.delete2tupleFromDb(id, DatabaseEnum.DICE_ROLLS);
  }

  /**
   * Loads the result of a dice roll from the DB.
   * @param {string} id the id of the dice roll to be obtained
   * @return {Promise<int>} will be fulfilled with the result of the requested
   * dice roll
   */
  loadDiceRoll(id) {
    return this.load2tupleFromDb(id, DatabaseEnum.DICE_ROLLS);
  }


  /**
   * Puts a piece of labelSet information into the DB.
   * @param {string} property the name of this property
   * @param {boolean} value the value of this property
   * @return {Promise} will be fulfilled if the insertion was successful and
   * rejected otherwise
   */
  saveLabelSetProperty(property, value) {
    return this.insert2tupleIntoDb(property, value, DatabaseEnum.LABEL_SET);
  }

  /**
   * Removes a piece of labelSet information from the DB.
   * @param {string} property the name of the property to be removed
   * @return {Promise} will be fulfilled if the removal was successful and
   * rejected otherwise
   */
  deleteLabelSetProperty(property) {
    return this.delete2tupleFromDb(property, DatabaseEnum.LABEL_SET);
  }

  /**
   * Loads a piece of labelSet information from the DB.
   * @param {string} property the name of the property to be obtained
   * @return {Promise<int>} will be fulfilled with the value of the requested
   * property
   */
  loadLabelSetProperty(property) {
    return this.load2tupleFromDb(property, DatabaseEnum.LABEL_SET);
  }

  /**
   * Returns the ids of all experiments that the user has conducted so far.
   * @return {Promise<Set<{svmId: int, iteration: int}>>} will be fulfilled with
   * the set of ids of the experiments that the user has already conducted
   */
  loadExperimentIds() {
    if (!(this.dbConn)) {
      return null;
    }

    const stmt = this.dbConn.createAsyncStatement('SELECT svm_id, iteration FROM experiment_ids LIMIT 200000');

    const ids = new Set();
    const that = this;
    return new Promise((resolve, reject) => {
      stmt.executeAsync({
        handleResult: (aResultSet) => {
          for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
            ids.add({ svmId: row.getResultByName('svm_id'),
              iteration: row.getResultByName('iteration') });
          }
        },
        handleError: (aError) => {
          if (that.secVm && that.secVm.debug) {
            that.secVm.log(`SQL error: ${aError.message}`);
          }
          reject();
        },
        handleCompletion: () => {
          resolve(ids);
        }
      });
    });
  }

  /**
   * Adds an experiment id to the database.
   * @param {{svmId: int, iteration: int}} id the id to be added
   * @return {Promise} will be fulfilled if the insertion was successful and
   * rejected otherwise.
   */
  addExperimentId(id) {
    if (!(this.dbConn)) {
      return null;
    }

    const stmt = this.dbConn.createStatement('INSERT OR REPLACE INTO experiment_ids VALUES (:svmId, :iteration)');
    stmt.params.svmId = id.svmId;
    stmt.params.iteration = id.iteration;

    const that = this;
    return new Promise((resolve, reject) => {
      stmt.executeAsync({
        handleError: (aError) => {
          if (that.secVm && that.secVm.debug) {
            that.secVm.log(`SQL error: ${aError.message}`);
          }
          reject();
        },
        handleCompletion: () => {
          resolve();
        }
      });
    });
  }


  /**
   * Puts a 2-tuple into the DB.
   * @param {string} id a unique id for this tuple
   * @param {Object} data the payload to be inserted
   * @param {string} database the database the tuple should be inserted into;
   * the value should come from the databaseEnum
   * @return {Promise} will be fulfilled if the insertion was successful and
   * rejected otherwise
   */
  insert2tupleIntoDb(id, data, database) {
    if (!(this.dbConn)) {
      return null;
    }

    const dbProperties = DatabaseEnum.properties[database];
    // TODO: investigate if there is a nicer way to incorporate dbProperties.name
    const stmt = this.dbConn.createStatement(`INSERT OR REPLACE INTO ${dbProperties.name} VALUES (:id, :data)`);
    stmt.params.id = id;
    stmt.params.data = data;

    const that = this;
    return new Promise((resolve, reject) => {
      stmt.executeAsync({
        handleError: (aError) => {
          if (that.secVm && that.secVm.debug) {
            that.secVm.log(`SQL error: ${aError.message}`);
          }
          reject();
        },
        handleCompletion: () => {
          resolve();
        }
      });
    });
  }

  /**
   * Removes a 2-tuple from the DB.
   * @param {string} id the id of the tuple to be removed
   * @param {string} database the database the tuple should be removed from; the
   * value should come from the databaseEnum
   * @return {Promise} will be fulfilled if the removal was successful and
   * rejected otherwise
   */
  delete2tupleFromDb(id, database) {
    if (!(this.dbConn)) {
      return null;
    }

    const dbProperties = DatabaseEnum.properties[database];
    // TODO: investigate if there is a nicer way to incorporate dbProperties.name etc.
    const stmt = this.dbConn.createStatement(`DELETE from ${dbProperties.name} WHERE ${dbProperties.tuple_first} = :id`);
    stmt.params.id = id;

    const that = this;
    return new Promise((resolve, reject) => {
      stmt.executeAsync({
        handleError: (aError) => {
          if (that.secVm && that.secVm.debug) {
            that.secVm.log(`SQL error: ${aError.message}`);
          }
          reject();
        },
        handleCompletion: () => {
          resolve();
        }
      });
    });
  }

  /**
   * @param {string} id the id of the tuple to be obtained
   * @param {string} database the database the tuple should be obtained from; the
   * value should come from the databaseEnum
   * @return {Promise<string>} will be fulfilled with the payload of the
   * requested tuple
   */
  load2tupleFromDb(id, database) {
    if (!(this.dbConn)) {
      return null;
    }

    const dbProperties = DatabaseEnum.properties[database];
    // TODO: investigate if there is a nicer way to incorporate dbProperties.tuple_first etc.
    const stmt = this.dbConn.createAsyncStatement(`SELECT ${dbProperties.tuple_first}, ${dbProperties.tuple_second} FROM ${dbProperties.name} WHERE ${dbProperties.tuple_first} = :id`);
    stmt.params.id = id;

    const res = [];
    const that = this;
    return new Promise((resolve, reject) => {
      stmt.executeAsync({
        handleResult: (aResultSet) => {
          for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
            if (row.getResultByName(dbProperties.tuple_first) === id) {
              res.push(row.getResultByName(dbProperties.tuple_second));
            } else {
              if (that.secVm && that.secVm.debug) {
                that.secVm.log('There is more than one record');
              }
              reject();
            }
            break;
          }
        },
        handleError: (aError) => {
          if (that.secVm && that.secVm.debug) {
            that.secVm.log(`SQL error: ${aError.message}`);
          }
          reject();
        },
        handleCompletion: () => {
          if (res.length === 1) {
            resolve(res[0]);
          } else {
            reject();
          }
        }
      });
    });
  }

  createTable() {
    const hashedFeatureVectors = 'create table if not exists hashed_feature_vectors(\n' +
                'id TEXT PRIMARY KEY NOT NULL,\n' +
                'vector TEXT \n' +
            ')';
    // const hashedFeatureVectors = 'drop table if exists hashed_feature_vectors';

    // with more than two outcomes, i.e. result can be any non-negative integer
    const diceRolls = 'create table if not exists dice_rolls(\n' +
          'id TEXT PRIMARY KEY NOT NULL,\n' +
          'result INTEGER \n' +
          ')';
    // const diceRolls = 'drop table if exists dice_rolls';

    const labelSet = 'create table if not exists label_set(\n' +
                'property TEXT PRIMARY KEY NOT NULL,\n' +
                'value BOOLEAN \n' +
            ')';
    // const label_set = 'drop table if exists label_set';

    const experimentIds = 'create table if not exists \'experiment_ids\' (\n' +
                '\'svm_id\' INTEGER NOT NULL,\n' +
                '\'iteration\' INTEGER NOT NULL,\n' +
                'CONSTRAINT pkey PRIMARY KEY (\'svm_id\', \'iteration\')\n' +
            ')';
    // const experimentIds = 'drop table if exists experiment_ids';

    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(hashedFeatureVectors);
    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(diceRolls);
    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(labelSet);
    (this.dbConn.executeSimpleSQLAsync || this.dbConn.executeSimpleSQL)(experimentIds);
  }


  /**
   * @param {function} rowCallback will be executed on every host
   * @return {Promise<>} will be fulfilled once all data has been passed trough
   * rowCallback
   */
  retrieveAllHostsFromHistory(rowCallback) {
    return HistoryManager.PlacesInterestsStorage._execute(
      [
        // We don't use 'LIMIT ' + numFeatures because we want to sample
        // randomly from the whole history later on.
        // Still 'LIMIT 100000' for performance reasons.
        'SELECT DISTINCT host FROM moz_hosts LIMIT 100000'
      ],
      ['host'],
      rowCallback
    );
  }

  /**
   * @param {function} rowCallback will be executed on every title
   * @return {Promise<>} will be fulfilled once all data has been passed trough
   * rowCallback
   */
  retrieveAllTitlesFromHistory(rowCallback) {
    return HistoryManager.PlacesInterestsStorage._execute(
      [
        // We don't use 'LIMIT ' + numFeatures because we want to sample
        // randomly from the whole history later on.
        // Still 'LIMIT 100000' for performance reasons.
        'SELECT DISTINCT title FROM moz_places LIMIT 100000'
      ],
      ['title'],
      rowCallback
    );
  }
}
