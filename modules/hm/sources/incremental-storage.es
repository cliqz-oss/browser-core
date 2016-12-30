import md5 from 'core/helpers/md5';
import utils from 'core/utils';
import { renameFile, fileExists, readFile, write, removeFile, createFile,
  pathJoin, openForAppend, closeFD, mkdir, writeFD } from 'core/fs';

/*
 * This class aims to solve the problem of modifying a JSON object persisted on disk
 * without having to rewrite the JSON file on each change. Essentially, we keep
 * two files: snapshot and journal. For each event that changes the data structure, we first
 * append it to the journal (fast) and then apply it on the in-memory data. So on each moment,
 * the state of the in-memory data can be recovered by reading the snapshot and applying on it
 * all the changes of the journal. From time to time we will do some 'merge' operation on the
 journal, which means rewriting the current snapshot so that the journal can be emptied.
 */

export default class IncrementalStorage {
  // processFunction is a function which will apply an event change on the current JSON object:
  // function(event, json)
  constructor() {
    this.obj = {};
    this.processFunction = null;
    this.filePrefix = null;
    this.dirName = null;
    this.isOpen = false;
    this.flushTimeout = 1000;
    this.snapshotTimeout = 1000 * 60 * 1; // Check every minute
    this.flushScheduler = null;
    this.acumTime = 0;
    this.journalFile = null;
    this.dirty = false;
    this.journalToFlush = [];
  }
  open(dbName, processFunction, dirName, exactName = false, immediateSnap = false) {
    this.filePrefix = exactName ? dbName : md5(dbName);
    this.processFunction = processFunction;
    this.dirName = dirName;
    this.immediateSnap = immediateSnap;
    return this.recoverBadState() // Also does the init for an empty DB
      .then(() => this.readFromDisk())
      .catch(() => this.destroy(true))
      .then(() => openForAppend(this.getJournalFile()))
      .then(f => {
        this.journalFile = f;
        this.isOpen = true;
        return this.startFlushes();
      });
  }
  close() {
    if (this.isOpen) {
      this.stopFlushes();
      this.processFunction = this.filePrefix = this.flushScheduler = null;
      this.isOpen = false;
      this.obj = {};
      return this.flush()
        .then(() => closeFD(this.journalFile));
    }
    return Promise.resolve();
  }
  destroy(corrupt = false) {
    this.stopFlushes();
    if (corrupt) {
      return renameFile(this.getNewSnapshotFile(), this.getNewSnapshotFile(true))
        .catch(() => {})
        .then(() => renameFile(this.getNewJournalFile(), this.getNewJournalFile(true)))
        .catch(() => {})
        .then(() => renameFile(this.getJournalFile(), this.getJournalFile(true)))
        .catch(() => {})
        .then(() => renameFile(this.getSnapshotFile(), this.getSnapshotFile(true)))
        .catch(() => {})
        .then(() => this.recoverBadState());
    }
    return removeFile(this.getNewSnapshotFile())
      .then(() => removeFile(this.getNewJournalFile()))
      .then(() => removeFile(this.getJournalFile()))
      .then(() => removeFile(this.getSnapshotFile()))
      .then(() => this.close());
  }
  processAux(event) {
    const now = Date.now();
    this.processFunction(event, this.obj);
    this.acumTime += Date.now() - now;
  }
  processEvent(event) {
    if (!this.isOpen) {
      throw new Error('IncrementalStorage instance is not open');
    }
    this.processAux(event);
    this.appendToJournal(event);
  }
  // If newObj is passed, then this will be the persisted obj
  // otherwise, the current this.obj will be used
  // FIXME: !!newObj might lead to inconsistencies...
  snapshot(newObj) {
    this.obj = newObj || this.obj;
    this.eventsQueue = [];
    this.scheduledSnapshot = true;
    this.dirty = true; // Small hack
    return Promise.resolve(this.obj);
  }

// PRIVATE
  doRealSnapshot() {
    const s = this.getSnapshotFile();
    const j = this.getJournalFile();
    const sn = this.getNewSnapshotFile();
    const jn = this.getNewJournalFile();
    return openForAppend(jn)
      .then(f => {
        closeFD(this.journalFile);
        this.journalFile = f;
        this.journalToFlush = [];
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

  // PRIVATE
  stopFlushes() {
    utils.clearTimeout(this.flushScheduler);
    this.flushScheduler = null;
  }
  startFlushes() {
    this.flushScheduler = utils.setTimeout(() => this.scheduleFlush(), this.flushTimeout);
  }
  flush() {
    const data = this.journalToFlush.splice(0, this.journalToFlush.length).join('');
    return writeFD(this.journalFile, data, { isText: true });
  }
  scheduleFlush() {
    this.stopFlushes();
    return this.flush()
      .then(() => {
        // TODO: if journal is empty, do nothing
        if (this.dirty && (this.immediateSnap || this.scheduledSnapshot || this.acumTime >= 1000)) {
          return this.doRealSnapshot();
        }
        return Promise.resolve();
      })
      .then(() => this.startFlushes());
  }
  recoverBadState() {
    this.acumTime = 0;
    const s = this.getSnapshotFile();
    const j = this.getJournalFile();
    const sn = this.getNewSnapshotFile();
    const jn = this.getNewJournalFile();
    const files = [s, j, sn, jn];
    return mkdir(this.getDir())
      .then(() => Promise.all(files.map(fileExists)))
      .then(present => {
        if (!present[2] && !present[3]) { // Initialize (or do nothing)
          if (!present[1]) {
            return write(s, JSON.stringify(this.obj), { isText: true })
              .then(() => createFile(j));
          } else if (present[0]) {
            return Promise.resolve();
          }
          throw new Error('unknown file state(1)');
        } else if (present[0] && present[1]) { // Rollback
          return Promise.all([removeFile(sn), removeFile(jn)]);
        } else if (!present[0]) { // Commit
          // TODO: This stage is already in snapshot, refactor
          return Promise.resolve(present[3] ? renameFile(jn, j) : null)
            .then(() => renameFile(sn, s));
        }
        throw new Error('unknown file state(2)');
      })
      .then(() => readFile(j, { isText: true }))
      .then(data => {
        // If journal does not end in endline, truncate to last endline found
        const lastEndline = data.lastIndexOf('\n') + 1;
        if (lastEndline !== data.length) {
          return write(jn, data.slice(0, lastEndline), { isText: true })
            .then(() => renameFile(jn, j));
        }
        return Promise.resolve();
      });
  }
  // Pre: !this.isOpen
  readFromDisk() {
    const snapshotFile = this.getSnapshotFile();
    const journalFile = this.getJournalFile();
    return Promise.all([
      readFile(snapshotFile, { isText: true }),
      readFile(journalFile, { isText: true }),
    ]).then(results => {
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
  getFile(filename) {
    return pathJoin(this.getDir(), filename);
  }
  getDir() {
    return this.dirName;
  }
  appendToJournal(e) {
    this.dirty = true;
    this.journalToFlush.push(`${JSON.stringify(e)}\n`);
  }
}
