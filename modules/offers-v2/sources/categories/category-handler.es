import { getTodayDayKey } from '../../core/time';
import { timestampMS } from '../utils';
import CategoryTree from './category-tree';
import { CategoriesMatchTraits, CategoryMatch } from './category-match';
import CategoryPersistentDataHelper from './category-persistent-helper';
import logger from '../common/offers_v2_logger';
import { buildSimplePatternIndex } from '../common/pattern-utils';
import { ThrottleWithRejection } from '../common/throttle-with-rejection';
import OffersConfigs from '../offers_configs';

const USER_PROFILE_CATEGORIES_ROOT = 'Segment.';

/**
 * @class CategoryHandler
 */
export default class CategoryHandler {
  constructor(historyFeature) {
    this.catTree = new CategoryTree();
    this.catMatch = new CategoryMatch();
    this.historyFeature = historyFeature;
    this.dayKeyOfLastAccountingRun = '00000000';
    // the caller should call init()
  }

  async init(db) {
    this.persistentHelper = new CategoryPersistentDataHelper(db);
    this.historyThrottle = new ThrottleWithRejection(
      OffersConfigs.THROTTLE_HISTORY_QUERIES_SECS || 180
    );
  }

  /**
   * Check if a category exists or not
   */
  hasCategory(catName) {
    return this.catTree.hasCategory(catName);
  }

  /**
   * returns a category if exists otherwise null will be returned
   */
  getCategory(catName) {
    const catNode = this.catTree.getCategoryNode(catName);
    return catNode ? catNode.getCategory() : null;
  }

  /**
   * Add a new category to be observed. Note that we should call build() after
   * adding all the categories we want to observe.
   */
  addCategory(category) {
    if (!this._checkCategory(category)) {
      logger.error('Category is invalid', category);
      return;
    }
    // check if we have the category => need to update? otherwise we add it
    if (this.hasCategory(category.getName())) {
      if (this._shouldUpdateCategory(category)) {
        logger.info(`updating category ${category.getName()}`);
        this.removeCategory(category);
      } else {
        // nothing to do
        return;
      }
    }
    this._addNewCategory(category);
  }

  /**
   * Will remove a particular category if exists.
   * Make sure to call build() after all the desired categories are removed
   */
  removeCategory(category) {
    const catName = category.getName();
    if (this.catTree.hasCategory(catName)) {
      logger.debug(`Category ${catName} is being removed`, category);
      this.catTree.removeCategory(catName);
      this.persistentHelper.categoryRemoved(category);
      this.catMatch.removeCategoryPatterns(catName);
    }
  }

  /**
   * This will build the proper data after categories were added / removed.
   * Without calling this method the expected behavior cannot be ensured.
   */
  build() {
    this.catMatch.build();
  }

  /**
   * will clean up the categories (to check if they are still valid or we should
   * remove some old data)
   */
  doDailyAccounting() {
    const todayKey = getTodayDayKey();
    if (todayKey === this.dayKeyOfLastAccountingRun) {
      return;
    }
    this._applyToAllSubCategories('', (cat) => {
      cat.cleanUp();
    });
    this.dayKeyOfLastAccountingRun = todayKey;
  }

  /**
   * we will call this method whenever there is a new location change so we
   * can evaluate all the categories for this case.
   * We will return the set of categories ids that had been activated for this url
   *
   * @method newUrlEvent
   * @param {PatternMatchRequest} tokenizedUrl
   * @returns {CategoriesMatchTraits}
  */
  newUrlEvent(tokenizedUrl) {
    if (!tokenizedUrl) {
      logger.error('skipping invalid tokenizedUrl', tokenizedUrl);
      return new CategoriesMatchTraits();
    }

    const matches = this.catMatch.checkMatches(tokenizedUrl);
    for (const catID of matches.getCategoriesIDs()) {
      const catNode = this.catTree.getCategoryNode(catID);
      if (catNode === null || !catNode.hasCategory()) {
        logger.error(`We do not have a category with id ${catID}??`);
      } else {
        // hit the category
        catNode.getCategory().hit();
        this._catModified(catNode.getCategory());

        logger.debug(`Category hit: ${catID}`);
      }
    }

    return matches;
  }

  loadPersistentData() {
    return this.persistentHelper.loadCategories().then((catList) => {
      this.catTree.clear();
      this.catMatch.clear();

      for (let i = 0; i < catList.length; i += 1) {
        const category = catList[i];
        this.catTree.addCategory(category);
        this.catMatch.addCategoryPatterns(category.getName(), category.getPatterns());
      }

      // build the pattern index here
      this.build();
    });
  }

  learnTargeting(featureName) {
    if (!featureName) {
      logger.warn('learnTargeting: expected parameter "featureName"');
      return;
    }
    const fullName = USER_PROFILE_CATEGORIES_ROOT + featureName;
    const cat = this.getCategory(fullName);
    if (!cat) {
      logger.warn(`learnTargeting: targeting category not found: ${fullName}`);
      return;
    }
    cat.hit();
  }

  /**
   * Add new categories, update existing, delete ones do not exist anymore.
   * If the update is empty, do nothing.
   *
   * @method syncCategories
   * @param {Iterator<Category>} categoriesIterator
   */
  syncCategories(categoriesIterator) {
    //
    // Add new, update existing. Remember the names of backend categories.
    //
    const seenNames = [];
    for (const category of categoriesIterator) {
      this.addCategory(category);
      seenNames.push(category.getName());
    }
    //
    // Do nothing if the update is empty
    //
    if (!seenNames.length) {
      return;
    }
    //
    // Delete categories that are not on the backend.
    //
    const namesToRemove = [];
    this._applyToAllSubCategories('', (cat) => {
      if (!seenNames.includes(cat.getName())) {
        namesToRemove.push(cat);
      }
    });
    namesToRemove.forEach(cat => this.removeCategory(cat));
    //
    // Bring categories to working state
    //
    this.build();
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                            QUERY METHODS
  // ///////////////////////////////////////////////////////////////////////////

  // recursive get the total count (sum)
  getMatchesForCategory(catName) {
    let matches = 0;
    this._applyToAllSubCategories(catName, (cat) => { matches += cat.getTotalMatches(); });
    return matches;
  }

  // get the max number of days in any of the children categories
  getMaxCountDaysForCategory(catName) {
    let maxNumDays = 0;
    this._applyToAllSubCategories(catName, (cat) => {
      maxNumDays = Math.max(maxNumDays, cat.countDaysWithMatches());
    });
    return maxNumDays;
  }

  getLastMatchTsForCategory(catName) {
    let result = 0;
    this._applyToAllSubCategories(catName,
      (cat) => { result = Math.max(result, cat.getLastMatchTs()); });
    return result > 0 ? result : null;
  }

  isCategoryActive(catName) {
    return this.hasCategory(catName)
      && this.catTree.someSubCategory(catName, catNode =>
        (catNode.hasCategory() && catNode.getCategory().isActive()));
  }

  // ///////////////////////////////////////////////////////////////////////////

  _shouldUpdateCategory(category) {
    const catNode = this.catTree.getCategoryNode(category.getName());
    return catNode === null
           || !catNode.hasCategory()
           || (catNode.getCategory().getVersion() !== category.getVersion());
  }

  _addNewCategory(category) {
    this.persistentHelper.categoryAdded(category);
    this.catTree.addCategory(category);
    this.catMatch.addCategoryPatterns(category.getName(), category.getPatterns());
  }

  /**
   * Lookup history and update how often the category was matched.
   * The function raises if the call to the history is throttled.
   * The caller should handle this case.
   *
   * @method importHistoricalData
   * @param category
   * @returns {Promise<void>}
   */
  async importHistoricalData(category) {
    return this.historyThrottle.executeAsync(
      () => this._importHistoricalDataUnthrottled(category)
    );
  }

  async _importHistoricalDataUnthrottled(category) {
    if (!this.historyFeature) {
      // no history feature so no historical data
      return;
    }

    const now = timestampMS();
    // to avoid possible issues we will generate a new id using the category name
    // and the current version
    const catPID = this._getCatHistoryPIDID(category);
    const patterns = category.getPatterns();

    const index = buildSimplePatternIndex(patterns);
    const historyQuery = {
      patterns,
      index,
      pid: catPID,
      start_ms: now - (category.getTimeRangeSecs() * 1000),
      end_ms: now
    };
    const data = await this.historyFeature.performQueryOnHistory(historyQuery); // expected to raise
    if (!data || !data.d || !data.d.match_data || !data.pid) {
      logger.error('invalid data received from the history module', data);
      return;
    }
    if (data.pid !== catPID) {
      logger.error(`invalid data for category ${category.getName()}?`, data);
      return;
    }
    category.updateWithHistoryData(data.d.match_data);
    this._catModified(category);
  }

  // Used by tests
  _resetHistoryThrottle() {
    this.historyThrottle.reset();
  }

  _checkCategory(category) {
    return !!category;
  }

  /**
   * will apply the function f to all the categories we find including the catName
   */
  _applyToAllSubCategories(catName, f) {
    // clean all the old possible categories data
    const allNodes = this.catTree.getAllSubCategories(catName);
    for (let i = 0; i < allNodes.length; i += 1) {
      const cat = allNodes[i].getCategory();
      if (cat) {
        f(cat);
      }
    }
  }

  _catModified(category) {
    this.persistentHelper.categoryModified(category);
  }

  _getCatHistoryPIDID(category) {
    return `${category.getName()}|${category.getVersion()}`;
  }
}
