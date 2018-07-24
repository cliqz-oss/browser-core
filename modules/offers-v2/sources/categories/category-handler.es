/**
 * # Objective / goal
 * The main idea of this module (`categories/*`) is provide an interface on to
 * the trigger engine to detect if a category is active or not.
 * The categories are organized in hierarchy, for example: `Electronics.Computer.Mouses`
 * is a category which the root (parent / first level category name) is `Electronics`,
 * later `Computer` and at the end (leaf) is `Mouses`.
 * A category can be considered as a (high level) tuple: (activation function,
 * list of patterns, name, hits per day, days to check).
 *
 * The basic data a category will use to evaluate (the activation function) is as follow:
 * `[(totalHits, totalMatches), ...]`
 * Where each entry in the list is a given day (from now till
 * number_of_days_we_consider_for_the_category).
 *
 * In order to be able to build this data we need to read the history of the
 * user (using the history-analyzer).
 *
 * # Files structure
 *
 * The files and functionalities are as follow:
 *
 * ## category.es
 *
 * Is the definition of what a category represents (check [1]). Basically holds
 * the data and the functions associated to the category itself like: check
 * activation + hit the category with a match.
 *
 * ## category-tree
 *
 * is just a helper tree class where we can easly query any category level (parent,
 * child, subchild, etc) and provide helper methods to get the categories.
 * A cateogry-tree-node can or cannot contain a category, since there are some
 * cases where we only will add a leaf, then automatically all the parents nodes
 * should be created.
 *
 * ## category-persistent-helper
 *
 * Tried to separate the logic of storing the trees and all persistent data in this
 * class, so we can optimize the way we store it without changing the logic on the
 * other side. we basically need to mark the data as dirty and thats all.
 *
 * ## category-match
 *
 * Trivial class to provide an interface of:
 *   - building categories patterns
 *   - given a url retrieve all the categories ids that matches (=> so we can
 *   increment the hits).
 *
 * ## day-count-helper
 *
 * This is the nastiest module in terms of "architecture", but i didn't find a
 * better way to avoid duplicated data and a performance issue. This class will
 * hold the total number of urls visited per day, which is later provided to the
 * categories for calculating the activation function.
 * The best way will be hold this data in all the categories, but this will mean:
 * In any url change we should update all the categories => store all of them for
 * persistent. (we may have 2k categories).
 *
 * ## category-handler.
 *
 * Is the entry point to handle everything regarding categories:
 *   - add / remove categories.
 *   - Performing the operation to the history when a new category is added.
 *   - Loading and saving the data.
 *   - counting the urls per day.
 *   - checking if a given url (pattern) matches some category and in that case
 *     increment (hit) each of them.
 *
 * # Using categories
 *
 * There are 2 new operations in (`trigger_machine/ops/category_expr`) that will
 * be the interface to the triggers:
 *   - add_categories (this is for now to be able to update categories using the
 *   same mechanisms, in the future we may change this to a resource or new endpoint).
 *   - is_category_active: which provides the minimum and almost unique function
 *   we need to check if a category is active or not.
 *
 * # why we do this
 *
 * Basically because:
 *   - Because will be much easier to create campaigns, just selectiong the
 *   categories that the offer belongs. => scale in terms of creating campaigns.
 *   - It is much easier to create a proper trigger tree (more efficient) than the
 *   current one.
 *   - It will perform much faster as it is currently on the client side.
 *   - Will be the first step for splitting the intent detection from the showing
 *   offers, which currently  are alltogeather in the triggers and is giving us
 *   some problems (complexity).
 *
 *
 */

import { timestampMS } from '../utils';
import CategoryTree from './category-tree';
import CategoryMatch from './category-match';
import CategoryPersistentDataHelper from './category-persistent-helper';
import logger from '../common/offers_v2_logger';
import DayCounterHelper from './day-counter-helper';
import { buildSimplePatternIndex } from '../common/pattern-utils';


export default class CategoryHandler {
  constructor(historyFeature, db) {
    this.catTree = new CategoryTree();
    this.catMatch = new CategoryMatch();
    if (historyFeature && historyFeature.isAvailable()) {
      this.historyFeature = historyFeature;
    } else {
      this.historyFeature = null;
    }
    this.persistentHelper = new CategoryPersistentDataHelper(db);
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
  // We will return the set of categories ids that had been activated for this url
  newUrlEvent(tokenizedUrl) {
    if (!tokenizedUrl) {
      logger.error('skipping invalid tokenizedUrl', tokenizedUrl);
      return new Set();
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

      logger.debug(`Category hitted: ${catID}`);
    });

    // increment the number of urls we have for this particular day
    this.dayCounterHelper.incToday();
    // TODO: optimize here to save not every time but every N url changes
    this.persistentHelper.saveDayCounterData(this.dayCounterHelper.serialize());

    return catIDSet;
  }

  loadPersistentData() {
    return this.persistentHelper.loadCategories().then((catList) => {
      this.catTree.clear();
      this.catMatch.clear();

      const obsoleteCategories = [];
      for (let i = 0; i < catList.length; i += 1) {
        const category = catList[i];
        if (category.isObsolete()) {
          obsoleteCategories.push(category);
        } else {
          this.catTree.addCategory(category);
          this.catMatch.addCategoryPatterns(category.getName(), category.getPatterns());
          // check if the category has history data setted up
          if (!category.isHistoryDataSettedUp()) {
            this._getHistoricalData(category);
          }
        }
      }

      // remove obsolete from the DB
      obsoleteCategories.forEach((cat) => {
        logger.debug(`Removing obsolete category: ${cat.getName()}`);
        this.persistentHelper.categoryRemoved(cat);
      });

      // build the pattern index here
      this.build();
    });
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
           (catNode.getCategory().getVersion() !== category.getVersion());
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
    const patterns = category.getPatterns();

    const index = buildSimplePatternIndex(patterns);
    const historyQuery = {
      patterns,
      index,
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
