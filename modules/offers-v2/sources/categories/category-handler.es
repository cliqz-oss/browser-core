import { getTodayDayKey } from '../../core/time';
import { timestampMS } from '../utils';
import CategoryTree from './category-tree';
import { CategoriesMatchTraits, CategoryMatch } from './category-match';
import CategoryPersistentDataHelper from './category-persistent-helper';
import logger from '../common/offers_v2_logger';
import { ThrottleWithRejection } from '../common/throttle-with-rejection';
import OffersConfigs from '../offers_configs';
import TemporaryBuildResources from './temporary-build-resources';

const USER_PROFILE_CATEGORIES_ROOT = 'Segment.';

/**
 * @class CategoryHandler
 */
export default class CategoryHandler {
  constructor(historyFeature) {
    this.historyFeature = historyFeature;
    this._zeroifyFields();
    // the caller should call init()
  }

  _zeroifyFields() {
    this.buildResources = null;
    this.catMatch = null;
    this.catTree = null;
    this.historyThrottle = null;
  }

  async init() {
    this.catTree = new CategoryTree();
    this.dayKeyOfLastAccountingRun = '00000000';
    this.historyThrottle = new ThrottleWithRejection(
      OffersConfigs.THROTTLE_HISTORY_QUERIES_SECS || 180
    );
    this.persistentHelper = new CategoryPersistentDataHelper();
  }

  destroy() {
    if (this.persistentHelper) {
      this.persistentHelper.destroy();
    }
    this._zeroifyFields();
  }

  _acquireBuildResources(callerName) {
    if (this.buildResources) {
      logger.error(`categories are already being modified, skipping '${callerName}'`);
      return false;
    }
    this.buildResources = new TemporaryBuildResources();
    return true;
  }

  _releaseBuildResources() {
    this.buildResources = null;
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
   * The `category` object is modified: patterns are removed.
   * @private
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
    const patterns = category.getPatterns();
    category.dropPatterns();
    this._addNewCategory(category, patterns);
  }

  /**
   * Will remove a particular category if exists.
   * @private
   */
  removeCategory(category) {
    const catName = category.getName();
    if (this.catTree.hasCategory(catName)) {
      logger.debug(`Category ${catName} is being removed`);
      this.catTree.removeCategory(catName);
    }
    if (this.buildResources) {
      this.buildResources.removeCategory(category);
    }
  }

  /**
   * This will build the proper data after categories were added / removed.
   * Without calling this method the expected behavior cannot be ensured.
   *
   * @param {Map<string, string[]>} patterns
   */
  build(patterns) {
    if (!this.buildResources) {
      logger.error('CategoryHandler::build() should be called with initialized resources');
      return;
    }
    this.catMatch = new CategoryMatch();
    this.catMatch.build(patterns);
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

  newUrlEvent(tokenizedUrl) {
    return this.getMatches(tokenizedUrl);
  }

  /**
   * we will call this method whenever there is a new location change so we
   * can evaluate all the categories for this case.
   * We will return the set of categories ids that had been activated for this url
   *
   * @method getMatches
   * @param {PatternMatchRequest} tokenizedUrl
   * @returns {CategoriesMatchTraits}
  */
  getMatches(tokenizedUrl) {
    if (!tokenizedUrl) {
      logger.warn('skipping invalid tokenizedUrl', tokenizedUrl);
      return new CategoriesMatchTraits();
    }
    if (!this.catMatch) {
      logger.warn('getMatches: helper object is not initialized');
      return new CategoriesMatchTraits();
    }

    const matches = this.catMatch.checkMatches(tokenizedUrl);
    for (const catID of matches.getCategoriesIDs()) {
      const catNode = this.catTree.getCategoryNode(catID);
      if (catNode === null || !catNode.hasCategory()) {
        logger.error(`We do not have a category with id ${catID}??`);
      } else {
        catNode.getCategory().hit();
        // intentionally not waiting for the async function
        this._catAccountingModified(catNode.getCategory());

        logger.debug(`Category hit: ${catID}`);
      }
    }

    return matches;
  }

  async loadPersistentData() {
    if (!this._acquireBuildResources('loadPersistentData')) {
      return false;
    }
    const catList = await this.persistentHelper.loadCategories();
    this.catTree.clear();

    for (const category of catList) {
      const patterns = category.getPatterns();
      category.dropPatterns();
      this.catTree.addCategory(category);
      this.buildResources.addCategory(category, patterns);
    }

    // build the pattern index here
    this.build(this.buildResources.patterns);

    this._releaseBuildResources();
    return true;
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
    // intentionally not waiting for the async function
    this._catAccountingModified(cat);
  }

  /**
   * Add new categories, update existing, delete ones do not exist anymore.
   * If the update is empty, do nothing.
   *
   * Prerequisite: `loadPersistentData` was already called
   *
   * @method syncCategories
   * @param {Iterator<Category>} categoriesIterator
   * @param {boolean} ifSyncEmpty If the update is empty, do the update. For unit tests.
   */
  async syncCategories(categoriesIterator, { ifSyncEmpty = false } = {}) {
    if (!this._acquireBuildResources('syncCategories')) {
      return;
    }
    //
    // Add new, update existing. Remember the names of backend categories.
    //
    const seenNames = new Set();
    for (const category of categoriesIterator) {
      this.addCategory(category);
      seenNames.add(category.getName());
    }
    //
    // Do nothing if the update is empty
    //
    if (!(seenNames.size || ifSyncEmpty)) {
      this._releaseBuildResources();
      return;
    }
    //
    // Delete categories that are not on the backend.
    //
    const catsToRemove = new Set();
    this._applyToAllSubCategories('', (cat) => {
      if (!seenNames.has(cat.getName())) {
        catsToRemove.add(cat);
      }
    });
    for (const cat of catsToRemove) {
      this.removeCategory(cat);
    }
    //
    // Bring categories to working state
    // Take all patterns from persistence, not delta from `buildResources`.
    //
    await this.persistentHelper.commitBuild(this.buildResources);
    const patterns = await this.persistentHelper.getPatterns();
    this.build(patterns);
    this._releaseBuildResources();
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

  _addNewCategory(category, patterns) {
    this.catTree.addCategory(category);
    this.buildResources.addCategory(category, patterns);
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

    const historyQuery = {
      patterns,
      categoryId: category.getName(),
      index: this.catMatch.getIndex(),
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
    this._catAccountingModified(category);
  }

  // Used by tests
  _resetHistoryThrottle() {
    this.historyThrottle.reset();
  }

  _checkCategory(category) {
    return Boolean(category);
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

  async _catAccountingModified(category) {
    await this.persistentHelper.categoryAccountingModified(category);
  }

  _getCatHistoryPIDID(category) {
    return `${category.getName()}|${category.getVersion()}`;
  }
}
