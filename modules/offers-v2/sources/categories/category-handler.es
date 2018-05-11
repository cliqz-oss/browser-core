import { timestampMS } from '../utils';
import CategoryTree from './category-tree';
import CategoryMatch from './category-match';
import CategoryPersistentDataHelper from './category-persistent-helper';
import logger from '../common/offers_v2_logger';
import DayCounterHelper from './day-counter-helper';


export default class CategoryHandler {
  constructor(historyFeature, db, patternMatchingHandler) {
    this.catTree = new CategoryTree();
    this.catMatch = new CategoryMatch(patternMatchingHandler);
    this.historyFeature = historyFeature;
    this.persistentHelper = new CategoryPersistentDataHelper(this.catTree, db);
    this.metadata = {
      version: 1
    };
    // for now we always save metadata
    this.dayCounterHelper = new DayCounterHelper();
    this.persistentHelper.loadDayCounterData().then((data) => {
      if (data) {
        this.dayCounterHelper.deserialize(data);
      }
    });
  }

  destroy() {
    this.persistentHelper.save();
    this.persistentHelper.destroy();
  }

  /**
   * Check if a category exists or not
   */
  hasCategory(catName) {
    return this.catTree.hasCategory(catName);
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
      this.catTree.removeCategory(catName);
      this.persistentHelper.categoryRemoved(category);
      this.catMatch.removeCategoryPatterns(catName);
      if (this.historyFeature) {
        this.historyFeature.removeEntry(this._getCatHistoryPIDID(category));
      }
    }
  }

  /**
   * This will build the proper data after categories were added / removed.
   * Without calling this method the expected behavior cannot be ensured.
   */
  build() {
    this.catMatch.build();
    // check if we need to get historical data for the categories
    this._applyToAllSubCategories('', (category) => {
      if (!category.isHistoryDataSettedUp()) {
        this._getHistoricalData(category);
      }
    });
  }

  /**
   * will clean up the categories (to check if they are still valid or we should
   * remove some old data)
   */
  cleanUp() {
    this._applyToAllSubCategories('', (cat) => {
      cat.cleanUp();
      if (cat.isObsolete()) {
        this.removeCategory(cat);
      }
    });
  }

  // we will call this method whenever there is a new location change so we
  // can evaluate all the categories for this case.
  newUrlEvent(tokenizedUrl) {
    if (!tokenizedUrl) {
      logger.error('skipping invalid tokenizedUrl', tokenizedUrl);
      return;
    }
    const catIDSet = this.catMatch.checkMatches(tokenizedUrl);
    catIDSet.forEach((catID) => {
      const catNode = this.catTree.getCategoryNode(catID);
      if (catNode === null || !catNode.hasCategory()) {
        logger.error(`We do not have a category with id ${catID}??`);
        return;
      }
      // hit the category
      catNode.getCategory().hit();
      this._catModified(catNode.getCategory());
    });
    // increment the number of urls we have for this particular day
    this.dayCounterHelper.incToday();
    // TODO: optimize here to save not every time but every N url changes
    this.persistentHelper.saveDayCounterData(this.dayCounterHelper.serialize());
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

  savePersistentData() {
    return this.persistentHelper.save();
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
    return this.hasCategory(catName) &&
      this.catTree.someSubCategory(catName, catNode =>
        (catNode.hasCategory() && catNode.getCategory().isActive()));
  }

  // ///////////////////////////////////////////////////////////////////////////

  _shouldUpdateCategory(category) {
    const catNode = this.catTree.getCategoryNode(category.getName());
    return catNode === null ||
           !catNode.hasCategory() ||
           (catNode.getCategory().getVersion() < category.getVersion());
  }

  _addNewCategory(category) {
    this.persistentHelper.categoryAdded(category);
    this.catTree.addCategory(category);
    this.catMatch.addCategoryPatterns(category.getName(), category.getPatterns());
    category.setTotalDayHandler(this.dayCounterHelper);
  }

  _getHistoricalData(category) {
    if (!this.historyFeature) {
      // no history feature so no historical data
      return;
    }

    const now = timestampMS();
    // to avoid possible issues we will generate a new id using the category name
    // and the current version
    const catPID = this._getCatHistoryPIDID(category);
    const historyQuery = {
      patterns: category.getPatterns(),
      pid: catPID,
      start_ms: now - (category.getTimeRangeSecs() * 1000),
      end_ms: now
    };
    this.historyFeature.performQuery(historyQuery).then((data) => {
      if (!data || !data.d || !data.d.match_data || !data.pid) {
        logger.error('invalid data received from the history module', data);
        return;
      }
      if (data.pid !== catPID) {
        logger.error(`invalid data for category ${category.getName()}?`, data);
        return;
      }
      category.updateWithHistoryData(data.d.match_data);
      this.dayCounterHelper.mergeDaysData(data.d.match_data.per_day);
      this._catModified(category);
    });
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
