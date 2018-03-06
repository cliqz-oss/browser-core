import Category from './category';
import SimpleDB from '../../core/persistence/simple-db';
import CachedMap from '../../core/persistence/cached-map';
import logger from '../common/offers_v2_logger';

const METADATA_DOC_ID = 'cliqz-cat-metadata';
const DAY_COUNTER_DOC_ID = 'cliqz-cat-day-counter';

/**
 * This method will return a persistent cached map or a normal one depending
 * on storage flag
 */
const buildCachedMap = (id, db) => {
  if (db) {
    return new CachedMap(id);
  }
  const map = new Map();
  map.init = () => Promise.resolve(true);
  return map;
};

/**
 * will return the intersection of 2 lists
 */
const intersection = (l1, l2) => {
  const s1 = new Set(l1);
  const s2 = new Set(l2);
  const result = [];
  s1.forEach((k1) => {
    if (s2.has(k1)) {
      result.push(k1);
    }
  });
  return result;
};

const extractCategoryData = (category) => {
  const catData = category.serialize();
  catData.patterns = undefined;
  return catData;
};

const buildCategoryFromDataAndPatterns = (catData, catPatterns) => {
  const category = new Category();
  category.deserialize(catData);
  category.patterns = catPatterns;
  return category;
};

/**
 * we will isolate the way we load the data in this helper. we will save the
 * patterns separated from the categories itself since they will highly probably
 * do not change.
 */
export default class CategoryPersistentDataHelper {
  constructor(db) {
    this.db = (db) ? new SimpleDB(db) : null;
    // we will store the data in 2 maps, one will contain the patterns and the
    // other will contain the category data itself
    this.categoriesDataMap = buildCachedMap('cliqz-categories-data', db);
    this.categoriesPatternsMap = buildCachedMap('cliqz-categories-patterns', db);
  }

  unloadDB() {
    return Promise.all([this.categoriesDataMap.unload(), this.categoriesPatternsMap.unload()]);
  }

  /**
   * Will remove all the data from DB
   */
  destroyDB() {
    return Promise.all([this.categoriesDataMap.destroy(), this.categoriesPatternsMap.destroy()]);
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
    return Promise.all([
      this.categoriesDataMap.init(),
      this.categoriesPatternsMap.init()]).then(() => {
      // we will do a sync here
      const catDataIDs = [...this.categoriesDataMap.keys()];
      const catPatternsIDs = [...this.categoriesPatternsMap.keys()];
      const validIDs = new Set(intersection(catDataIDs, catPatternsIDs));

      const removeInvalidSignals = (currentIDs, map) => {
        currentIDs.forEach((catID) => {
          if (!validIDs.has(catID)) {
            map.delete(catID);
          }
        });
      };

      // remove all entries that are not valid anymore
      removeInvalidSignals(catDataIDs, this.categoriesDataMap);
      removeInvalidSignals(catPatternsIDs, this.categoriesPatternsMap);

      const result = [];
      validIDs.forEach((catID) => {
        const catObject = this.categoriesDataMap.get(catID);
        const catPatterns = this.categoriesPatternsMap.get(catID);
        result.push(buildCategoryFromDataAndPatterns(catObject, catPatterns));
      });
      return Promise.resolve(result);
    });
  }

  // only the data is modified
  categoryModified(category) {
    if (!category || !this.categoriesDataMap.has(category.getName())) {
      logger.error('Invalid category modified', category);
      return;
    }
    // store only the data
    this.categoriesDataMap.set(category.getName(), extractCategoryData(category));
  }

  categoryRemoved(category) {
    if (category) {
      this.categoriesPatternsMap.delete(category.getName());
      this.categoriesDataMap.delete(category.getName());
    }
  }

  categoryAdded(category) {
    if (category) {
      // here we will split the patterns and the data
      this.categoriesPatternsMap.set(category.getName(), category.getPatterns());
      this.categoriesDataMap.set(category.getName(), extractCategoryData(category));
    }
  }
}
