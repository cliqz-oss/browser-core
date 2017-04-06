import CliqzUtils from 'core/utils';

function error(e) {
  return typeof !e || e === 'string' ? (e || '') : `${e.message} ${e.stack}`;
}

/*
 * This class allows to observe changes on a SQLite table without querying the full table every
 * time.
 * The implementation creates a secondary table to store changes, and creates triggers that write
 * changes to this secondary table whenever the main changes. Then, we do polling on the table,
 * propagate changes and delete them.
 */

 // WARNING: right now only TEMP tables and triggers are created (which means they are not
 // persisted). And only tested for places.sqlite DB. Firefox source code uses TEMP triggers for
 // this extensively, so it seems reasonable to assume it is safe to do, and in practice seems
 // to work well. But in theory TEMP triggers should only catch modifications made from the same
 // connection the trigger was created (as I understand), so it would be wise to check if this
 // keeps working well for future versions.

 // Besides, in some cases an UPDATE trigger has been activated for a whole table, meaning that
 // every row was detected as a change. A hypothesis for this is that a places.sqlite migration
 // to a newer version caused it
 // (see https://dxr.mozilla.org/mozilla-central/source/toolkit/components/places/Database.cpp).
 // It can be found that in some cases an UPDATE moz_table is done without WHERE clause, which
 // would cause these kind of problems. One possible solution would be filtering out trigger events
 // if they don't change any field (can be done at DB level). Other would be just DELETING all
 // pending events if there are too many of them (possibly losing some legitimate ones). I think
 // the latter is better, since the other method might fail in some cases (there is a new field
 // which is computed for the first time).

 // Finally, since the table schema might change at any moment (we do not know when Firefox does
 // migrations, for example), we have to check periodically that the schema matches the TEMP
 // table we have create, and otherwise recreate.

export default class TableChangeObserver {
  constructor() {
    this.queryExecutor = null;
    this.tableName = null;
    this.tableSchema = null;
    this.changesTableName = null;
    this.eventCallback = null;
    this.propagateTimer = null;
    this.ondiscardedevents = null;
  }

    /**
     * This callback is used to execute Queries
     *
     * @callback queryExecutor
     * @param {string} sql - The query to execute
     * @returns {Promise<Array>} - Returns a promise with an array of rows, with each row being
     *  array of values
     */

    /**
     * This callback is used for propagating new events
     *
     * @callback eventCallback
     * @param {Object} event - The event, format is the following:
     *  {
     *   table:[table name],
     *   pks:[array with columns (names) that form the primary key],
     *   action:[create|update|delete],
     *   ts:[timestamp],
     *   row:[object with colName:value pairs, in case of deletion of the old row, otherwise of
     *    the new row]
     *  }
     */

  createTable() {
    return this.loadTableMetadata()
      .then(() => {
        CliqzUtils.log('Creating tables...');
        const myCols = this.tableSchema.cols.concat(this.extraCols)
          .map(x => `${x.name} ${x.type}`).join(', ');
        const myColsNames = this.tableSchema.cols.concat(this.extraCols)
          .map(x => x.name).join(', ');
        const myPks = this.tableSchema.pk.map(x => this.tableSchema.cols[x].name).join(', ');
        const myValuesDelete = this.tableSchema.cols.map(x => `old.${x.name}`)
          .concat(this.extraCols.map(x => x.expr.replace(/%/g, 'old'))).join(', ');
        const myValuesInsert = this.tableSchema.cols.map(x => `new.${x.name}`)
          .concat(this.extraCols.map(x => x.expr.replace(/%/g, 'new'))).join(', ');
        const myValuesUpdate = myValuesInsert;

        // We set the original pks of the table as UNIQUE constraint in the changes
        // table, and ON CONFLICT REPLACE
        // This way, we only keep the latest change for each original row, which is
        // the only thing we need
        const sqlCreate = `CREATE TEMP TABLE ${this.changesTableName}` +
          '(_myid INTEGER PRIMARY KEY, _myaction STRING, _myts STRING DEFAULT ' +
          `(strftime('%Y-%m-%d %H:%M:%f', 'now')), ${myCols}, UNIQUE(${myPks}) ` +
          'ON CONFLICT REPLACE);';

        const tableName = this.tableName;
        const sqlTriggerDelete = `CREATE TEMP TRIGGER _trigger_delete_${this.changesTableName}` +
          ` AFTER DELETE ON ${tableName} BEGIN INSERT INTO ${this.changesTableName} ` +
          `(_myaction, _myts, ${myColsNames}) VALUES("delete", ` +
          `(strftime('%Y-%m-%d %H:%M:%f', 'now')), ${myValuesDelete}); END;`;

        const sqlTriggerInsert = `CREATE TEMP TRIGGER _trigger_insert_${this.changesTableName}` +
          ` AFTER INSERT ON ${tableName} BEGIN INSERT INTO ${this.changesTableName} ` +
          `(_myaction, _myts, ${myColsNames}) VALUES("insert", ` +
          `(strftime('%Y-%m-%d %H:%M:%f', 'now')), ${myValuesInsert}); END;`;

        const sqlTriggerUpdate = `CREATE TEMP TRIGGER _trigger_update_${this.changesTableName}` +
          ` AFTER UPDATE ON ${tableName} BEGIN INSERT INTO ${this.changesTableName} ` +
          `(_myaction, _myts, ${myColsNames}) VALUES("update", ` +
          `(strftime('%Y-%m-%d %H:%M:%f', 'now')), ${myValuesUpdate}); END;`;

        return this.queryExecutor(sqlCreate)
          .then(() => this.queryExecutor(sqlTriggerDelete))
          .then(() => this.queryExecutor(sqlTriggerInsert))
          .then(() => this.queryExecutor(sqlTriggerUpdate));
      });
  }

  getTableSchema(tableName) {
    return this.queryExecutor(`PRAGMA table_info(${tableName});`)
      .then(rows => {
        if (rows.length === 0) {
          throw new Error(`Could not load metadata: ${tableName}`);
        }
        const tableSchema = {
          pk: [],
          cols: [],
        };
        rows.forEach(x => {
          // TODO: do we need to cast these values?
          const cid = x[0];
          tableSchema.cols[cid] = {
            cid,
            name: x[1],
            type: x[2],
            notnull: x[3],
            dflt_value: x[4],
            pk: x[5],
          };
          if (tableSchema.cols[cid].pk) {
            tableSchema.pk.push(cid);
          }
        });
        tableSchema.pk.sort();
        return tableSchema;
      });
  }

  loadTableMetadata() {
    return this.getTableSchema(this.tableName)
      .then(schema => (this.tableSchema = schema));
  }

  dropTriggers() {
    const sqlTriggerDelete = `DROP TRIGGER IF EXISTS _trigger_delete_${this.changesTableName}`;
    const sqlTriggerInsert = `DROP TRIGGER IF EXISTS _trigger_insert_${this.changesTableName}`;
    const sqlTriggerUpdate = `DROP TRIGGER IF EXISTS _trigger_update_${this.changesTableName}`;
    return Promise.all([
      this.queryExecutor(sqlTriggerDelete),
      this.queryExecutor(sqlTriggerInsert),
      this.queryExecutor(sqlTriggerUpdate),
    ]);
  }

  dropTable() {
    return this.queryExecutor(`DROP TABLE IF EXISTS ${this.changesTableName}`);
  }

  /**
   * Inits the TableChangeObserver
   * @param {queryExecutor} queryExecutor - Function to call for executing sql queries.
   * @param {string} tableName - The name of the table to observe.
   * @param {eventCallback} eventCallback - The callback that will handle each new event.
   * @param {int} propagationTimeout - Milliseconds between polls to the changes table.
   * @returns {Promise} - Will fulfill when work is done.
   */
  init(queryExecutor, tableName, eventCallback, extraCols = [], propagationTimeout = 5000,
    maxEvents = 1000
  ) {
    const tname = tableName.toLowerCase();
    this.propagationTimeout = propagationTimeout;
    this.queryExecutor = queryExecutor;
    this.tableName = tname;
    this.eventCallback = eventCallback;
    // To avoid possible collisions if there are several observers on same table
    this.changesTableName = `_changes_${tname}_${Math.round(Math.random() * 10000000000000000)}`;
    this.extraCols = extraCols;
    this.maxEvents = maxEvents;
    return this.createTable()
      .then(() => this.scheduleEventPropagation())
      .catch(e => CliqzUtils.log(error(e), 'error init table-change-observer'));
  }
  unload() {
    if (this.propagateTimer) {
      CliqzUtils.clearTimeout(this.propagateTimer);
      this.propagateTimer = null;
      this.ondiscardedevents = null;
    }
  }
  scheduleEventPropagation() {
    CliqzUtils.clearTimeout(this.propagateTimer);
    this.propagateTimer = CliqzUtils.setTimeout(
      () => this.propagateEvents(),
      this.propagationTimeout
    );
  }
  checkTableSchema() {
    return this.loadTableMetadata()
      .then(() => this.getTableSchema(this.changesTableName))
      .then(schema => {
        const extraCols = new Set(this.extraCols.map(x => x.name));
        // TODO: Compare schema with this.tableSchema, if they differ, then drop table and triggers
        const myCols = schema.cols
          .filter(x => !extraCols.has(x.name) &&
            x.name !== '_myid' &&
            x.name !== '_myaction' &&
            x.name !== '_myts'
          )
          .map(x => ({ name: x.name, type: x.type }));
        myCols.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });

        const cols = this.tableSchema.cols
          .map(x => ({ name: x.name, type: x.type }));
        cols.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
        if (JSON.stringify(myCols) !== JSON.stringify(cols)) {
          CliqzUtils.log(`${this.tableName} schema changed!`);
          throw new Error('schema changed');
        }
      })
      .catch(e => {
        CliqzUtils.log(error(e), 'checkTableSchema');
        return this.dropTriggers()
          .catch(() => {})
          .then(() => this.dropTable())
          .catch(() => {})
          .then(() => this.createTable());
      });
  }
  propagateEvents() {
    const MAX_EVENTS = this.maxEvents;
    return this.checkTableSchema()
      .then(() => this.queryExecutor(`SELECT COUNT(*) FROM ${this.changesTableName}`))
      .then(cntRows => {
        const numEvents = cntRows[0][0];
        if (numEvents > MAX_EVENTS) {
          CliqzUtils.log('Dropping all events, too many');
          if (this.ondiscardedevents) {
            this.ondiscardedevents();
          }
          return this.queryExecutor(`DELETE FROM ${this.changesTableName}`);
        }
        return this.queryExecutor(`SELECT * FROM ${this.changesTableName} ORDER BY _myts`)
          .then(rows => {
            const ids = [];
            rows.forEach(row => {
              ids.push(row[0]);
              const action = row[1];
              const ts = row[2];
              const e = {
                table: this.tableName,
                pks: this.tableSchema.pk.map(x => this.tableSchema.cols[x].name),
                action,
                ts,
                row: {},
              };
              this.tableSchema.cols.concat(this.extraCols).forEach((col, idx) => {
                e.row[col.name] = row[idx + 3];
              });
              try {
                this.eventCallback(e);
              } catch (err) {
                CliqzUtils.log(`${error(err)} ${JSON.stringify(e)}`, 'ERROR propagateEvents cb');
              }
            });
                // TODO: split this into several statements just in case
            return this.queryExecutor(
              `DELETE FROM ${this.changesTableName} WHERE _myid IN (${ids.join(', ')});`
            );
          })
          .catch(e => CliqzUtils.log(`${error(e)} ${this.tableName}`, 'ERROR propagating events'))
          .then(() => this.scheduleEventPropagation());
      });
  }
}
