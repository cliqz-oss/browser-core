import { utils } from '../../core/cliqz';
import Category from './category';
import SimpleDB from '../../core/persistence/simple-db';

const PATTERN_DOC_ID = 'cliqz-cat-patterns';
const CATEGORIES_DOC_ID = 'cliqz-cat-categories';
const METADATA_DOC_ID = 'cliqz-cat-metadata';
const DAY_COUNTER_DOC_ID = 'cliqz-cat-day-counter';
const AUTO_SAVE_TIME_FREQ_SECS = 60;

/**
 * we will isolate the way we load the data in this helper. we will save the
 * patterns separated from the categories itself since they will highly probably
 * do not change.
 */
export default class CategoryPersistentDataHelper {
  constructor(catTree, db) {
    this.db = (db) ? new SimpleDB(db) : null;
    this.catTree = catTree;
    this.needsToUpdatePatterns = false;
    this.needsToUpdateCategories = false;

    // we will save frequently if we detect changes on the categories / patterns
    this.autosaveTimer = utils.setInterval(() => {
      this.save();
    }, AUTO_SAVE_TIME_FREQ_SECS * 1000);
  }

  destroy() {
    utils.clearInterval(this.autosaveTimer);
  }

  loadMetadata() {
    return this.db.get(METADATA_DOC_ID);
  }

  saveMetadata(metadata) {
    return this.db.upsert(METADATA_DOC_ID, metadata);
  }

  loadDayCounterData() {
    return this.db.get(DAY_COUNTER_DOC_ID);
  }

  saveDayCounterData(data) {
    return this.db.upsert(DAY_COUNTER_DOC_ID, data);
  }

  /**
   * will return a promise with a list of all the categories already built
   */
  loadCategories() {
    this._clear();
    const patternsProm = this.db.get(PATTERN_DOC_ID);
    const categoriesProm = this.db.get(CATEGORIES_DOC_ID);
    return Promise.all([patternsProm, categoriesProm]).then((data) => {
      const patternsData = data[0] && data[0].patternsMap ? data[0].patternsMap : {};
      const catData = data[1] && data[1].catList ? data[1].catList : [];
      const result = [];
      for (let i = 0; i < catData.length; i += 1) {
        const category = new Category();
        const catDataObj = catData[i];
        catDataObj.patterns = patternsData[catDataObj.name];
        category.deserialize(catDataObj);
        // do not load anything on debug
        if (!utils.getPref('offersDevFlag', false)) {
          result.push(category);
        }
      }

      return Promise.resolve(result);
    });
  }

  save() {
    let patternsProm = true;
    if (this.needsToUpdatePatterns) {
      patternsProm = this.db.upsert(PATTERN_DOC_ID, { patternsMap: this._getPatternsFromTree() });
      this.needsToUpdatePatterns = false;
    }
    let catProm = true;
    if (this.needsToUpdateCategories) {
      catProm = this.db.upsert(CATEGORIES_DOC_ID, { catList: this._categories() });
      this.needsToUpdateCategories = false;
    }
    return Promise.all([patternsProm, catProm]);
  }

  categoryModified(/* category */) {
    this.needsToUpdateCategories = true;
  }

  categoryRemoved(/* category */) {
    this.needsToUpdateCategories = true;
    this.needsToUpdatePatterns = true;
  }

  categoryAdded(/* category */) {
    this.needsToUpdateCategories = true;
    this.needsToUpdatePatterns = true;
  }

  _getPatternsFromTree() {
    return this._categories().filter(cat => cat.hasPatterns()).map(cat => cat.getPatterns());
  }

  _categories() {
    return this.catTree.getAllSubCategories('')
      .filter(node => node.hasCategory())
      .map(catNode => catNode.getCategory());
  }

  _clear() {
    this.needsToUpdatePatterns = false;
    this.needsToUpdateCategories = false;
  }
}
