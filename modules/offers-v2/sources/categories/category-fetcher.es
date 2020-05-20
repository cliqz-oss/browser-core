/**
 * This module will be in charge of perform all the fetching logic from the backend
 * and re-sync of the categories on the handler.
 * We should also persist the latest hash / revision we got so we are able to know
 * if we need to do an update or not from the categories.
 */

import Category from './category';
import logger from '../common/offers_v2_logger';
import SimpleDB from '../../core/persistence/simple-db';
import pacemaker from '../../core/services/pacemaker';
import { shouldKeepResource, getLocation } from '../utils';

// name of the key on the DB
const CATEGORY_FETCHER_DB_ID = 'cliqz-cat-fetcher';


/**
 * Helper method that will check if the json coming from the backend has
 * the proper fields we need to build a category or not.
 * Returns null if not, a new category otherwise
 */
const buildCategoryFromJSON = (jsonObj) => {
  if (!jsonObj
      || !jsonObj.name
      || !jsonObj.patterns
      || !jsonObj.revHash
      || !jsonObj.timeRangeSecs
      || !jsonObj.activationData) {
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
    this.db = db ? new SimpleDB(db, logger) : null;
    // this revision will be used as id to be sent to the BE to check if
    // there is a new version or not of the categories list to be fetched
    this.lastRevision = null;
    this.intervalTimer = null;
    this._performFetch = this._performFetch.bind(this);
  }

  async init() {
    if (this.db) {
      const persistentState = await this.db.get(CATEGORY_FETCHER_DB_ID);
      if (persistentState) {
        this.lastRevision = persistentState.lastRevision;
      }
    }
    this.intervalTimer = pacemaker.everyHour(this._performFetch);

    // To finish initialization, something should call `postInit`.
    // If we called it here, an http request to the backend would
    // slow down initialization of the extension.
  }

  async postInit() {
    await this._performFetch();
  }

  unload() {
    if (this.intervalTimer) {
      this.intervalTimer.stop();
      this.intervalTimer = null;
    }
  }

  /**
   * Will perform the fetch and set the categories if any
   */
  async _performFetch() {
    try {
      const payload = await this.beConnector.sendApiRequest(
        'categories',
        { last_rev: this.lastRevision, country: getLocation().country },
        'GET',
        { useCache: false }
      );
      let categories = payload.categories;
      const revision = payload.revision;

      if (!categories || !revision) {
        logger.error('We got an invalid response from the BE, skipping this.', payload);
        return false;
      }

      // #EX-7061 - filter all the categories that dont belong to us
      const keepCategory = c =>
        c && ((c.user_group === undefined) || shouldKeepResource(c.user_group));

      categories = categories.filter(keepCategory);
      // store the last revision for future usage
      this._setLatestRevision(revision);

      logger.info(`Fetched ${categories.length} categories from backend`);

      // for each category now we do the update, for now the backend will return
      // an empty list if the revision is the same, meaning that there is nothing
      // to add here.
      await this._updateCategories(categories);

      this.categoryHandler.doDailyAccounting();
      return true;
    } catch (err) {
      logger.error(`Can't load categories: ${err}`);
      return false;
    }
  }

  async _setLatestRevision(revision) {
    this.lastRevision = revision;
    if (this.db) {
      await this.db.upsert(CATEGORY_FETCHER_DB_ID, { lastRevision: revision });
    }
  }

  /**
   * Will update the list of categories using the result from the backend
   */
  async _updateCategories(categories) {
    function* categoriesIterator() {
      for (const jsonCategory of categories) {
        const category = buildCategoryFromJSON(jsonCategory);
        if (category) {
          yield category;
        } else {
          logger.error('Invalid category from BE:', category);
        }
      }
    }
    await this.categoryHandler.syncCategories(categoriesIterator());
  }
}
