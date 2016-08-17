import md5 from 'core/helpers/md5';

/*
 * This class aims to solve the problem of modifying a JSON object persisted on disk
 * without having to rewrite the JSON file on each change. Essentially, we keep
 * two files: snapshot and journal. For each event that changes the data structure, we first
 * append it to the journal (fast) and then apply it on the in-memory data. So on each moment,
 * the state of the in-memory data can be recovered by reading the snapshot and applying on it
 * all the changes of the journal. From time to time we will do some 'merge' operation on the
 journal, which means rewriting the current snapshot so that the journal can be emptied.
 */


// IMPORTANT!!! Always call close or destroy when finished, otherwise the object will keep alive
// and can give problems if another instance with same dbName is open later (two instances of
// IncrementalStorage changing same files at the same time, without locks)

// TODO: get rid of this Firefox-dependent imports
Components.utils.import('resource://gre/modules/NetUtil.jsm');
Components.utils.import('resource://gre/modules/FileUtils.jsm');

// TODO: processFunction could be avoided if we use a generic way to detect change events to
// this.obj. But generally, the events done in this way will be larger...
// TODO: check that the journal ends with endline, otherwise remove until it does (means that
// the processed crashed while writing journal)
export default class IncrementalStorage {
  // processFunction is a function which will apply an event change on the current JSON object:
  // function(event, json)
  constructor() {
    this.obj = {};
    this.processFunction = null;
    this.filePrefix = null;
    this.dirName = null;
    this.isOpen = false;
    this.eventsQueue = [];
    this.flushTimeout = 1000;
    this.snapshotTimeout = 1000 * 60 * 1; // Check every minute
    this.timeLastSnapshot = 0;
    this.flushScheduler = null;
    this.onOpenPromises = [];
    this.acumTime = 0;
  }
  open(dbName, processFunction, dirName = 'HMSearch', exactName = false) {
    this.filePrefix = exactName ? dbName : IncrementalStorage.md5(dbName);
    this.processFunction = processFunction;
    this.dirName = dirName;
    return this.recoverBadState() // Also does the init for an empty DB
      .then(() => this.readFromDisk())
      .catch(() => this.destroy(true))
      .then(() => {
        this.isOpen = true;
        this.onOpenPromises.splice(0, this.onOpenPromises.length).forEach(p => p());
        return this.startFlushes();
      });
  }
  close() {
    if (this.isOpen) {
      this.stopFlushes();
      this.processFunction = this.filePrefix = this.flushScheduler = null;
      this.eventsQueue = [];
      this.isOpen = false;
      this.obj = {};
    }
    return Promise.resolve();
  }
  destroy(corrupt = false) {
    this.stopFlushes();
    if (corrupt) {
      return IncrementalStorage.renameFile(this.getNewSnapshotFile(), this.getNewSnapshotFile(true))
        .catch(() => {})
        .then(() => IncrementalStorage.renameFile(this.getJournalFile(), this.getJournalFile(true)))
        .catch(() => {})
        .then(() =>
          IncrementalStorage.renameFile(this.getSnapshotFile(), this.getSnapshotFile(true))
        )
        .catch(() => {})
        .then(() => this.recoverBadState());
    }
    return IncrementalStorage.removeFile(this.getNewSnapshotFile())
        .then(() => IncrementalStorage.removeFile(this.getJournalFile()))
        .then(() => IncrementalStorage.removeFile(this.getSnapshotFile()))
        .then(() => this.close());
  }
  processAux(event) {
    const now = Date.now();
    this.processFunction(event, this.obj);
    this.acumTime += Date.now() - now;
  }
  processEvent(event) {
    return this.waitOpen()
      .then(() => {
        this.processAux(this.appendToJournal(event));
      });
  }
  // If newObj is passed, then this will be the persisted obj
  // otherwise, the current this.obj will be used
  snapshot(newObj) {
    this.obj = newObj || this.obj;
    this.eventsQueue = [];
    this.scheduledSnapshot = true;
    return Promise.resolve(this.obj);
  }

// PRIVATE
  doRealSnapshot() {
    const s = this.getSnapshotFile();
    const j = this.getJournalFile();
    const sn = this.getNewSnapshotFile();
    return IncrementalStorage.persistToFile(sn, this.obj)
      .then(() => IncrementalStorage.removeFile(s))
      .then(() => IncrementalStorage.truncateFile(j))
      .then(() => IncrementalStorage.renameFile(sn, s))
      .catch((e) => {
        // This should not happen
        CliqzUtils.log(e, 'FATAL: Snapshot error');
        return this.recoverBadState();
      })
      .then(() => {
        this.scheduledSnapshot = false;
        this.acumTime = 0;
        return this.obj;
      });
  }
  waitOpen() {
    return new Promise((resolve) => {
      if (this.isOpen) {
        resolve();
      } else {
        this.onOpenPromises.push(resolve);
      }
    });
  }
  stopFlushes() {
    CliqzUtils.clearTimeout(this.flushScheduler);
    this.flushScheduler = null;
  }
  startFlushes() {
    this.flushScheduler = CliqzUtils.setTimeout(() => this.scheduleFlush(), this.flushTimeout);
  }
  scheduleFlush() {
    this.stopFlushes();
    return Promise.resolve()
      .then(() => {
        let willSnap = this.scheduledSnapshot;
        if (!willSnap && this.timeLastSnapshot > this.snapshotTimeout) {
          const snap = this.getSnapshotFile();
          const journal = this.getJournalFile();
          if (snap.exists() && journal.exists()) {
            const snapSize = snap.fileSize;
            const journalSize = journal.fileSize;
            if (journalSize > 0) {
              // If journal is bigger than 1 MB, or is more than half the size of snapShot, or
              // acumTime > 1s do it
              // TODO: this is completely arbitrary, probably should think it better (or use config
              // params)
              if (this.acumTime >= 1000 ||
                journalSize > 1024 * 1024 * 1 ||
                snapSize / journalSize < 2
              ) {
                willSnap = true;
              }
            }
          }
        }
        if (willSnap) {
          this.timeLastSnapshot = 0;
          return this.doRealSnapshot();
        }
        this.timeLastSnapshot += this.flushTimeout;
        return Promise.resolve();
      })
      .then(() => this.flushJournal())
      .then(() => this.startFlushes());
  }
  recoverBadState() {
    this.acumTime = 0;
    const s = this.getSnapshotFile();
    const j = this.getJournalFile();
    const sn = this.getNewSnapshotFile();
    const jn = this.getNewJournalFile();
    const files = [s, j, sn, jn];
    return Promise.all(files.map(IncrementalStorage.fileExists))
      .then(present => {
        if (present[3]) {
          return IncrementalStorage.removeFile(jn)
            .then(() => present);
        }
        return present;
      })
      .then(present => {
        if (!present[2]) { // Initialize (or do nothing)
          if (!present[1]) {
            return IncrementalStorage.persistToFile(s, this.obj)
              .then(() => IncrementalStorage.createEmptyFile(j));
          } else if (present[0]) {
            return Promise.resolve();
          }
          throw new Error('unknown file state(1)');
        } else if (present[0] && present[1]) { // Rollback
          return IncrementalStorage.removeFile(sn);
        } else if (present[1]) { // Commit
          // TODO: This stage is already in snapshot, refactor
          return IncrementalStorage.truncateFile(j)
            .then(() => IncrementalStorage.renameFile(sn, s));
        }
        throw new Error('unknown file state(2)');
      })
      .then(() => IncrementalStorage.readToString(j))
      .then(data => {
        // If journal does not end in endline, truncate to last endline found
        const lastEndline = data.lastIndexOf('\n') + 1;
        if (lastEndline !== data.length) {
          return IncrementalStorage.writeString(jn, data.slice(0, lastEndline))
            .then(() => IncrementalStorage.renameFile(jn, j));
        }
        return Promise.resolve();
      });
  }
    // Pre: !this.isOpen
  readFromDisk() {
    const snapshotFile = this.getSnapshotFile();
    const journalFile = this.getJournalFile();
    return Promise.all([
      IncrementalStorage.readJSONFile(snapshotFile),
      IncrementalStorage.readLinesFile(journalFile),
    ]).then(results => {
      this.obj = results[0];
      results[1].forEach(e => this.processAux(JSON.parse(e)));
      this.eventsQueue.forEach(e => this.processAux(JSON.parse(e)));
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
    // TODO: do firefox-independent (ProfD?)
    return FileUtils.getFile('ProfD', [this.dirName, filename]);
  }
  static readToString(file, contentType = 'text/plain') {
    return new Promise((resolve, reject) => {
      const channel = NetUtil.newChannel(file);
      channel.contentType = contentType;
      NetUtil.asyncFetch(channel, (inputStream, status) => {
        if (!Components.isSuccessCode(status)) {
          reject(new Error('json read error'));
        }
        let bytesAvail = 0;
        try {
          bytesAvail = inputStream.available();
        } catch (e) {
          CliqzUtils.log(
            `Error when reading in readToString ${e.message} ${e.stack}`, 'incremental-storage'
          );
        }
        let data = '';
        if (bytesAvail > 0) {
          data = NetUtil.readInputStreamToString(inputStream, bytesAvail, { charset: 'UTF-8' });
        }
        resolve(data);
      });
    });
  }
  static writeString(file, data, flags) {
    return new Promise((resolve, reject) => {
      let ostream;
      if (flags | FileUtils.MODE_APPEND) {
        ostream = FileUtils.openFileOutputStream(file, flags);
      } else {
        ostream = FileUtils.openSafeFileOutputStream(file, flags);
      }
      const converter = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].
                    createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      converter.charset = 'UTF-8';
      const istream = converter.convertToInputStream(data);
      NetUtil.asyncCopy(istream, ostream, (status) => {
        if (!Components.isSuccessCode(status)) {
          reject(new Error('string write error'));
        }
        resolve(data);
      });
    });
  }
  static readJSONFile(file) {
    return IncrementalStorage.readToString(file, 'application/json')
        .then((data) => {
          try {
            return JSON.parse(data);
          } catch (e) {
            throw new Error('json parse error');
          }
        });
  }
  static readLinesFile(file) {
    return IncrementalStorage.readToString(file)
      .then((data) => data.split('\n').filter(x => x !== ''));
  }
    // Will not fail if file does not exist
  static removeFile(file) {
    if (file.exists()) {
      return Promise.resolve(file.remove(false));
    }
    return Promise.resolve();
  }
  static createEmptyFile(file) {
    return Promise.resolve(
      file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE,
      FileUtils.PERMS_FILE)
    );
  }
  static persistToFile(file, obj) {
    const data = JSON.stringify(obj); // TODO: This could be CPU intensive...
    return IncrementalStorage.writeString(file, data);
  }
  static truncateFile(file) {
    const mutatingFile = file;
    mutatingFile.fileSize = 0;
    return Promise.resolve(mutatingFile.fileSize);
  }
  static appendLineToFile(file, data) {
    return IncrementalStorage.writeString(
      file,
      `${data}\n`,
      FileUtils.MODE_APPEND | FileUtils.MODE_WRONLY
    );
  }
  static fileExists(file) {
    return Promise.resolve(file.exists());
  }
  static renameFile(oldFile, newFile) {
    return Promise.resolve()
        .then(() => oldFile.renameTo(null, newFile.leafName));
  }
  static md5(s) {
    return md5(s);
  }
  appendToJournal(e) {
    const MAX_QUEUE_LENGTH = 100000;
    this.eventsQueue.push(JSON.stringify(e));
    if (this.eventsQueue.length > MAX_QUEUE_LENGTH) {
      CliqzUtils.log('Max queue length reached', 'hm/incremental-storage');
      this.eventsQueue.shift();
    }
    return e;
  }
  flushJournal(full = false) {
    const MAX_EVENTS = 1000;
    const data = this.eventsQueue.splice(0, full ? this.eventsQueue.length : MAX_EVENTS).join('\n');
    if (data) {
      return IncrementalStorage.appendLineToFile(this.getJournalFile(), data);
    }
    return Promise.resolve();
  }
}
