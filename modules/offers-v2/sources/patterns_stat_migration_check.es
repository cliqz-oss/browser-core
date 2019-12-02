/*
  This script provides documentation
  about migration and possible lifecycle
  of our users. Also script can check
  whether your new migration
  of patternStats is OK or not.
*/

import getDexie from '../platform/lib/dexie';
import logger from './common/offers_v2_logger';
import {
  PatternsStat,
  dexieSchemaV2 as SCHEMA_V2,
  dexieSchemaLast as SCHEMA_V3,
} from './patterns_stat';

const DB_NAME = 'offers-patterns-stat';
const DB2_NAME = 'offers-patterns-stat-v2';
const SCHEMA_V1 = { views: '++id' };

export default class MigrationCheck {
  static async scenario11() {
    await this.dropDb2();
    await this.lifecycleLast();
  }

  // special case
  static async scenario10() {
    await this.dropDb2();
    await this.lifecycleLast();
    await this.lifecycleLast();
  }

  // As of June 2019, the most of extensions should run "v4",
  // so the only real case to check is v4 -> v5.
  //
  // Regarding vX -> v5:
  // - there is a lot of test for vX -> v4, and
  // . v5 is like v4.
  //
  // Therefore, no reason to check vX -> v5 deeply, one test is enough,
  // just to make sure nothing is spoiled.
  //

  // v4 -> v5
  static async scenario9() {
    await this.dropDb2();
    await this.lifecycle4();
    await this.lifecycle5();
  }

  // v1 -> v5
  static async scenario8() {
    await this.dropDb2();
    await this.lifecycle1();
    await this.lifecycle5();
  }

  // v3 -> v4
  static async scenario7() {
    await this.lifecycle3();
    await this.lifecycle4();
  }

  // v2 -> v4
  static async scenario6() {
    await this.lifecycle2();
    await this.lifecycle4();
  }

  // v1 -> v4
  static async scenario5() {
    await this.lifecycle1();
    await this.lifecycle4();
  }

  // v2 -> v3 -> v4
  static async scenario4() {
    await this.lifecycle2();
    await this.lifecycle3(2); // should be errors (see warnings)
    await this.lifecycle4();
  }

  // v1 -> v3 -> v4
  static async scenario3() {
    await this.lifecycle1();
    await this.lifecycle3();
    await this.lifecycle4();
  }

  // v1 -> v2 -> v4
  static async scenario2() {
    await this.lifecycle1();
    await this.lifecycle2(4); // should be errors (see warnings)
    await this.lifecycle4();
  }

  // v1 -> v2 -> v3 -> v4
  static async scenario1() {
    await this.lifecycle1();
    await this.lifecycle2(4); // should be errors (see warnings)
    await this.lifecycle3();
    await this.lifecycle4();
  }

  static async lifecycleLast() {
    return this.lifecycle5();
  }

  static async lifecycle5() {
    const patternsStat = await this.releaseLast();
    await patternsStat.add('offer_ca_action', { campaignId: 'fakeId-release5' });
    await patternsStat.add('offer_closed', { campaignId: 'fakeId-release5' });
    const result = await patternsStat.moveAll('offer_closed');
    if (result.length !== 1) {
      logger.error('lifecycle5 failed');
    } else {
      logger.warn('OK: we have data:', result);
    }
    patternsStat.destroy();
  }

  static async lifecycle4(errCount = 0) {
    const db = await this.release4();
    // eslint-disable-next-line object-curly-spacing
    const errors1 = await this.add(db, 'offer_triggered', {campaignId: 'fakeId-release4'});
    const errors2 = await this.clear(db, 'landing');
    const errors = errors1.concat(errors2);
    if (errors.length !== errCount) {
      logger.error('lifecycle4 failed', errors);
    } else if (errCount) {
      logger.warn('OK: catching errors:', errors);
    }
    db.close();
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

  static async init(dbname = DB_NAME) {
    const Dexie = await getDexie();
    const db = await new Dexie(dbname);
    return db;
  }

  static async dropDb2() {
    const Dexie = await getDexie();
    await Dexie.delete(DB2_NAME);
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

  // As of before July 2019
  static async release4() {
    const db = await this.init(DB2_NAME);
    db.version(1).stores(SCHEMA_V2);
    return db;
  }

  // As of July 2019
  static async release5() {
    const db = await this.init(DB2_NAME);
    db.version(1).stores(SCHEMA_V2);
    db.version(3).stores(SCHEMA_V3);
    return db;
  }

  static async releaseLast() {
    const patternsStat = new PatternsStat(String, { on: () => {}, unsubscribe: () => {} });
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
