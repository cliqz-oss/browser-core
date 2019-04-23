/*
  This script provides documentation
  about migration and possible lifecycle
  of our users. Also script can check
  whether your new migration
  of patternStats is OK or not.
*/

import getDexie from '../platform/lib/dexie';
import PatternsStat from './patterns_stat';
import logger from './common/offers_v2_logger';

const DB_NAME = 'offers-patterns-stat';
// eslint-disable-next-line object-curly-spacing
const SCHEMA_V1 = {views: '++id'};
const SCHEMA_V2 = {
  offer_triggered: '++id',
  landing: '++id',
  success: '++id',
};

export default class MigrationCheck {
  // v4
  static async scenario9() {
    await this.lifecycleLast();
  }

  // special case
  static async scenario8() {
    await this.lifecycleLast();
    await this.lifecycleLast();
  }

  // v3 -> v4
  static async scenario7() {
    await this.lifecycle3();
    await this.lifecycleLast();
  }

  // v2 -> v4
  static async scenario6() {
    await this.lifecycle2();
    await this.lifecycleLast();
  }

  // v1 -> v4
  static async scenario5() {
    await this.lifecycle1();
    await this.lifecycleLast();
  }

  // v2 -> v3 -> v4
  static async scenario4() {
    await this.lifecycle2();
    await this.lifecycle3(2); // should be errors (see warnings)
    await this.lifecycleLast();
  }

  // v1 -> v3 -> v4
  static async scenario3() {
    await this.lifecycle1();
    await this.lifecycle3();
    await this.lifecycleLast();
  }

  // v1 -> v2 -> v4
  static async scenario2() {
    await this.lifecycle1();
    await this.lifecycle2(4); // should be errors (see warnings)
    await this.lifecycleLast();
  }

  // v1 -> v2 -> v3 -> v4
  static async scenario1() {
    await this.lifecycle1();
    await this.lifecycle2(4); // should be errors (see warnings)
    await this.lifecycle3();
    await this.lifecycleLast();
  }

  static async lifecycleLast() {
    const patternsStat = await this.releaseLast();
    // eslint-disable-next-line object-curly-spacing
    await patternsStat.add('offer_triggered', {campaignId: 'fakeId-release4'});
    // eslint-disable-next-line object-curly-spacing
    await patternsStat.add('landing', {campaignId: 'fakeId-release4'});
    const result = await patternsStat.moveAll('landing');
    if (result.length !== 1) {
      logger.error('lifecycleLast failed');
    } else {
      logger.warn('OK: we have data:', result);
    }
    patternsStat.destroy();
  }

  static async lifecycle3(errCount = 0) {
    const db = await this.release3();
    // eslint-disable-next-line object-curly-spacing
    const errors1 = await this.add(db, 'landing', {campaignId: 'fakeId-release3'});
    const errors2 = await this.clear(db, 'landing');
    const errors = errors1.concat(errors2);
    if (errors.length !== errCount) {
      logger.error('lifecycle3 failed', errors);
    } else if (errCount) {
      logger.warn('OK: catching errors:', errors);
    }
    db.close();
  }

  static async lifecycle2(errCount = 0) {
    const db = await this.release2();
    // eslint-disable-next-line object-curly-spacing
    const errors1 = await this.add(db, 'landing', {campaignId: 'fakeId-release2'});
    // eslint-disable-next-line object-curly-spacing
    const errors2 = await this.add(db, 'offer_triggered', {campaignId: 'fakeId-relesase2'});
    const errors3 = await this.clear(db, 'offer_triggered');
    const errors4 = await this.clear(db, 'landing');
    const errors = errors1.concat(errors2).concat(errors3).concat(errors4);
    if (errors.length !== errCount) {
      logger.error('lifecycle2 failed', errors);
    } else if (errCount) {
      logger.warn('OK: catching errors:', errors);
    }
    db.close();
  }

  static async lifecycle1(errCount = 0) {
    const db = await this.release1();
    // eslint-disable-next-line object-curly-spacing
    const errors1 = await this.add(db, 'views', {campaignId: 'fakeId-release1'});
    const errors2 = await this.clear(db, 'views');
    const errors = errors1.concat(errors2);
    if (errors.length !== errCount) {
      logger.error('lifecycle1 failed', errors);
    } else if (errCount) {
      logger.warn('OK: catching errors:', errors);
    }
    db.close();
  }

  static async init() {
    const Dexie = await getDexie();
    const db = await new Dexie(DB_NAME);
    return db;
  }

  static async release1() {
    const db = await this.init();
    db.version(1).stores(SCHEMA_V1);
    return db;
  }

  static async release2() {
    const db = await this.init();
    db.version(1).stores(SCHEMA_V2);
    return db;
  }

  static async release3() {
    const db = await this.init();
    db.version(1).stores(SCHEMA_V1);
    db.version(2).stores(SCHEMA_V2);
    return db;
  }

  static async releaseLast() {
    const patternsStat = new PatternsStat(String);
    await patternsStat.init();
    return patternsStat;
  }

  static async add(db, collection, data) {
    const errors = [];
    await db;
    await db[collection]
      .add(data)
      .catch(err => errors.push([collection, err.message, 'add', data]));
    return errors;
  }

  static async clear(db, collection) {
    const errors = [];
    await db;
    await db[collection]
      .clear()
      .catch(err => errors.push([collection, err.message, 'clear']));
    return errors;
  }
}
