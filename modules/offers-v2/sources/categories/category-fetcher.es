/**
 * This module will be in charge of perform all the fetching logic from the backend
 * and re-sync of the categories on the handler.
 * We should also persist the latest hash / revision we got so we are able to know
 * if we need to do an update or not from the categories.
 */

import Category from './category';
import logger from '../common/offers_v2_logger';
import SimpleDB from '../../core/persistence/simple-db';
import setTimeoutInterval from '../../core/helpers/timeout';
import { shouldKeepResource } from '../utils';
import prefs from '../../core/prefs';

// Constant defining how frequently we want to fetch categories from BE
const FETCH_FREQ_MS = 1000 * 60 * 60 * 1;
// name of the key on the DB
const CATEGORY_FETCHER_DB_ID = 'cliqz-cat-fetcher';


/**
 * Helper method that will check if the json coming from the backend has
 * the proper fields we need to build a category or not.
 * Returns null if not, a new category otherwise
 */
const buildCategoryFromJSON = (jsonObj) => {
  if (!jsonObj ||
      !jsonObj.name ||
      !jsonObj.patterns ||
      !jsonObj.revHash ||
      !jsonObj.timeRangeSecs ||
      !jsonObj.activationData) {
    return null;
  }
  return new Category(
    jsonObj.name,
    jsonObj.patterns,
    jsonObj.revHash,
    jsonObj.timeRangeSecs,
    jsonObj.activationData
  );
};


export default class CategoryFetcher {
  constructor(backendConnector, categoryHandler, db) {
    this.beConnector = backendConnector;
    this.categoryHandler = categoryHandler;
    this.db = (db && !prefs.get('offersDevFlag', false)) ? new SimpleDB(db) : null;
    // this revision will be used as id to be sent to the BE to check if
    // there is a new version or not of the categories list to be fetched
    this.lastRevision = null;
    this.intervalTimer = null;
    this.startTimer = null;
  }

  init() {
    const startIntervalFetch = () => {
      if (this.intervalTimer === null) {
        this.intervalTimer = setTimeoutInterval(this._performFetch.bind(this), FETCH_FREQ_MS);
        // we want to perform the fetch in a while not right now
        this.startTimer = setTimeout(this._performFetch.bind(this), 1000 * 5);
      }
    };

    if (this.db) {
      return this.db.get(CATEGORY_FETCHER_DB_ID).then((data) => {
        if (data) {
          this.lastRevision = data.lastRevision;
        }
        startIntervalFetch();
      });
    }

    // no db
    startIntervalFetch();
    return Promise.resolve();
  }

  unload() {
    if (this.intervalTimer) {
      this.intervalTimer.stop();
      this.intervalTimer = null;
      clearTimeout(this.startTimer);
    }
  }

  /**
   * Will perform the fetch and set the categories if any
   */
  _performFetch() {
    return this.beConnector.sendApiRequest(
      'categories',
      { last_rev: this.lastRevision },
      'GET').then((payload) => {
      let categories = payload.categories;
      const revision = payload.revision;

      if (!categories || !revision) {
        logger.error('We got an invalid response from the BE, skipping this.', payload);
        return Promise.resolve(false);
      }

      // #EX-7061 - filter all the categories that dont belong to us
      const keepCategory = c =>
        c && ((c.user_group === undefined) || shouldKeepResource(c.user_group));

      categories = categories.filter(keepCategory);
      // store the last revision for future usage
      this._setLatestRevision(revision);

      logger.info(`Fetched ${categories.length} categories from backend`);
      if (logger.LOG_LEVEL === 'debug') {
        logger.logObject(categories);
      }

      // for each category now we do the update, for now the backend will return
      // an empty list if the revision is the same, meaning that there is nothing
      // to add here.
      this._updateCategories(categories);

      return Promise.resolve(true);
    });
  }

  _setLatestRevision(revision) {
    this.lastRevision = revision;
    if (this.db) {
      this.db.upsert(CATEGORY_FETCHER_DB_ID, { lastRevision: revision });
    }
  }

  /**
   * Will update the list of categories using the result from the backend
   */
  _updateCategories(categories) {
    let shouldRebuild = false;
    for (let i = 0; i < categories.length; i += 1) {
      const category = buildCategoryFromJSON(categories[i]);
      if (category) {
        // this method will check if the category is new or should be updated
        this.categoryHandler.addCategory(category);
        shouldRebuild = true;
      } else {
        logger.error('Invalid category from BE?', category);
      }
    }
    if (shouldRebuild) {
      this.categoryHandler.build();
    }
  }
}
