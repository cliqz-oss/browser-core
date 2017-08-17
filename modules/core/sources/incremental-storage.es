import md5 from './helpers/md5';
import utils from './utils';
import console from './console';
import { renameFile, fileExists, readFile, write, removeFile, createFile,
  openForAppend, closeFD, mkdir, writeFD } from './fs';

/*
 * This class should be useful for modifying a JSON object persisted on disk
 * without having to rewrite the JSON file on each change. Essentially, we keep
 * two files: snapshot and journal. For each event that changes the data structure, we first
 * append it to the journal (fast) and then apply it on the in-memory data. So on each moment,
 * the state of the in-memory data can be recovered by reading the snapshot and applying on it
 * all the changes of the journal. From time to time we will do some 'merge' operation on the
 journal, which means rewriting the current snapshot so that the journal can be emptied.
 */

// TODO: open lock?
export default class IncrementalStorage {
  // processFunction is a function which will apply an event change on the current JSON object:
  // function(event, json)
  constructor() {
    this.setInitialState();
  }
  open(dbName, processFunction, dirName, exactName = false, immediateSnap = false) {
    if (this.isOpening) {
      return new Error('already opening incremental-storage db');
    }
    if (this.isOpen) {
      return new Error('already open incremental-storage db');
    }
    this.filePrefix = exactName ? dbName : md5(dbName);
    this.processFunction = processFunction;
    this.dir = Array.isArray(dirName) ? dirName : [dirName];
    this.immediateSnap = immediateSnap;
    this.isOpening = true;
    return this.recoverBadState() // Also does the init for an empty DB
      .then(() => this.readFromDisk())
      .catch(() => this.handleCorrupt()) // TODO: maybe an error does not mean corrupt data...
      .then(() => openForAppend(this.getJournalFile()))
      .then((f) => {
        this.journalFile = f;
        this.isOpen = true;
        this.isOpening = false;
        this.onShutdown = () => this.close();
      });
  }
  close() {
    if (this.isOpen) {
      this.isOpen = false;
      utils.clearTimeout(this.flushTimer);
      return this._flush()
        .then(() => closeFD(this.journalFile))
        .then(() => this.setInitialState());
    }
    return Promise.resolve();
  }
  snapshot() {
    this.scheduledSnapshot = true;
    this.flush();
  }
  processEvent(event) {
    if (!this.isOpen) {
      throw new Error('IncrementalStorage instance is not open');
    }
    const error = this.processAux(event);
    if (!error) {
      this.appendToJournal(event);
    } else {
      console.error('[incremental-storage]', this.dbName, 'Event:', event, 'Error:', error);
      this.appendError(event, error);
    }
  }
  destroy() {
    if (this.isOpen) {
      const nsf = this.getNewSnapshotFile();
      const njf = this.getNewJournalFile();
      const jf = this.getJournalFile();
      const sf = this.getSnapshotFile();
      const ef = this.getErrorFile();

      this.close();

      return removeFile(nsf)
      .then(() => removeFile(njf))
      .then(() => removeFile(jf))
      .then(() => removeFile(sf))
      .then(() => removeFile(ef));
    }
    return Promise.resolve();
  }
  // Replaces internal object by new one
  replace(obj) {
    this.obj = obj;
    this.toFlush = [];
    this.snapshot();
    return this.flush();
  }

  // PRIVATE
  setInitialState() {
    this.obj = {};
    this.dir = null;
    this.isOpen = false;
    this.acumTime = 0;
    this.journalFile = null;
    this.dirty = false;
    this.toFlush = [];
    this.isOpening = false;
    this.onShutdown = null;
    this.flushResolver = this.flushTimer = this.processFunction = this.filePrefix = null;
  }
  handleCorrupt() {
    return renameFile(this.getNewSnapshotFile(), this.getNewSnapshotFile(true))
      .catch(() => {})
      .then(() => renameFile(this.getNewJournalFile(), this.getNewJournalFile(true)))
      .catch(() => {})
      .then(() => renameFile(this.getJournalFile(), this.getJournalFile(true)))
      .catch(() => {})
      .then(() => renameFile(this.getSnapshotFile(), this.getSnapshotFile(true)))
      .catch(() => {})
      .then(() => renameFile(this.getErrorFile(), this.getErrorFile(true)))
      .catch(() => {})
      .then(() => this.recoverBadState());
  }
  processAux(event) {
    const now = Date.now();
    try {
      this.processFunction(event, this.obj);
    } catch (e) {
      let error;
      if (!e) {
        error = 'Error';
      } else if (e.stack || e.message) {
        error = `Error: ${e.message} || ${e.stack}`;
      } else {
        error = `Error: ${e}`;
      }
      return error;
    }
    this.acumTime += Date.now() - now;
    return null;
  }
  doRealSnapshot() {
    const s = this.getSnapshotFile();
    const j = this.getJournalFile();
    const sn = this.getNewSnapshotFile();
    const jn = this.getNewJournalFile();
    return openForAppend(jn)
      .then((f) => {
        closeFD(this.journalFile);
        this.journalFile = f;
        this.toFlush = [];
        this.dirty = false;
        return write(sn, JSON.stringify(this.obj), { isText: true });
      })
      .then(() => removeFile(s))
      .then(() => renameFile(jn, j))
      .then(() => renameFile(sn, s))
      .catch((e) => {
        // This should not happen
        utils.log(e, 'FATAL: Snapshot error');
        return this.recoverBadState();
      })
      .then(() => {
        this.scheduledSnapshot = false;
        this.acumTime = 0;
        return this.obj;
      });
  }
  _flush() {
    const data = this.toFlush.splice(0, this.toFlush.length).join('');
    return writeFD(this.journalFile, data, { isText: true });
  }
  flush() {
    if (!this.isOpen) {
      return Promise.reject(new Error('incremental-storage not open'));
    }
    if (!this.flushPromise) {
      const flusher = () => {
        this._flush()
        .catch(e => this.error('Error in flush', e))
        .then(() => {
          if (
            this.isOpen &&
            (this.scheduledSnapshot ||
            (this.dirty && (this.immediateSnap || this.acumTime >= 1000)))) {
            return this.doRealSnapshot();
          }
          return null;
        })
        .then(() => {
          const resolve = this.flushResolver;
          this.flushTimer = this.flushPromise = this.flushResolver = null;
          resolve();
          if (this.toFlush.length > 0) {
            this.flush();
          }
        });
      };
      this.flushTimer = utils.setTimeout(flusher, 0);
      this.flushPromise = new Promise((resolve) => {
        this.flushResolver = resolve;
      });
    }
    return this.flushPromise;
  }
  recoverBadState() {
    this.acumTime = 0;
    const s = this.getSnapshotFile();
    const j = this.getJournalFile();
    const sn = this.getNewSnapshotFile();
    const jn = this.getNewJournalFile();
    const files = [s, j, sn, jn];
    return mkdir(this.dir)
      .then(() => Promise.all(files.map(fileExists)))
      .then((present) => {
        if (!present[2] && !present[3]) { // Initialize (or do nothing)
          if (!present[1]) {
            return write(s, JSON.stringify(this.obj), { isText: true })
              .then(() => createFile(j));
          } else if (present[0]) {
            return null;
          }
          throw new Error('unknown file state(1)');
        } else if (present[0] && present[1]) { // Rollback
          return Promise.all([removeFile(sn), removeFile(jn)]);
        } else if (!present[0]) { // Commit
          // TODO: This stage is already in snapshot, refactor
          if (present[3]) {
            return renameFile(jn, j).then(() => renameFile(sn, s));
          }
          return renameFile(sn, s);
        }
        throw new Error('unknown file state(2)');
      })
      .then(() => readFile(j, { isText: true }))
      .then((data) => {
        // If journal does not end in endline, truncate to last endline found
        const lastEndline = data.lastIndexOf('\n') + 1;
        if (lastEndline !== data.length) {
          return write(jn, data.slice(0, lastEndline), { isText: true })
            .then(() => renameFile(jn, j));
        }
        return null;
      });
  }
  // Pre: !this.isOpen
  readFromDisk() {
    const snapshotFile = this.getSnapshotFile();
    const journalFile = this.getJournalFile();
    return Promise.all([
      readFile(snapshotFile, { isText: true }),
      readFile(journalFile, { isText: true }),
    ]).then((results) => {
      this.obj = JSON.parse(results[0]);
      const lines = results[1].split('\n').filter(x => x !== '');
      this.dirty = lines.length > 0;
      lines.forEach(e => this.processAux(JSON.parse(e)));
    });
  }
  getJournalFile(corrupt = false) {
    return this.getFile(`${this.filePrefix}.journal${corrupt ? '.corrupt' : ''}`);
  }
  getNewJournalFile(corrupt = false) {
    return this.getFile(`${this.filePrefix}.journal_new${corrupt ? '.corrupt' : ''}`);
  }
  getSnapshotFile(corrupt = false) {
    return this.getFile(`${this.filePrefix}${corrupt ? '.corrupt' : ''}`);
  }
  getNewSnapshotFile(corrupt = false) {
    return this.getFile(`${this.filePrefix}.new${corrupt ? '.corrupt' : ''}`);
  }
  getErrorFile(corrupt = false) {
    return this.getFile(`${this.filePrefix}.error${corrupt ? '.corrupt' : ''}`);
  }
  getFile(filename) {
    return this.dir.concat(filename);
  }
  appendToJournal(e) {
    this.dirty = true;
    this.toFlush.push(`${JSON.stringify(e)}\n`);
    this.flush();
  }
  appendError(event, error) {
    openForAppend(this.getErrorFile())
    .then((f) => {
      const data = { ts: (new Date()).toISOString(), event, error };
      return writeFD(f, `${JSON.stringify(data)}\n`, { isText: true })
      .catch(() => {})
      .then(() => closeFD(f));
    });
  }
}
