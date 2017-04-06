import FSBuilder from 'tests/core/unit/utils/fs';

/* global chai */
/* global describeModule */

const expect = chai.expect;
const crypto = System._nodeRequire('crypto');
const _fs = FSBuilder(System._nodeRequire('path'));

export default describeModule('core/simple-storage',
  () => ({
    'core/utils': {
      default: {
        log: () => {},
        setTimeout,
        clearTimeout,
      },
    },
    'core/helpers/md5': {
      default: data => crypto.createHash('md5').update(data).digest('hex'),
    },
    'core/fs': _fs,
    'platform/shutdown-blocker': {
      addShutdownBlocker: () => {},
      removeShutdownBlocker: () => {},
    },
    'core/console': console,
  }),
  () => {
    describe('SimpleStorageTest', function () {
      this.timeout(5000);
      let SimpleStorage;
      beforeEach(function () {
        SimpleStorage = this.module().default;
      });

      it('SimpleStorage - basic', function () {
        var dbname = 'test' + Math.round(Math.random() * 1000000000);
        var dirName = 'StorageTests';
        var exactName = true;
        var immediateSnap = false;
        var ss = new SimpleStorage();
        var N = 5000;
        var obj = {};

        return ss.open(dbname, dirName, exactName, immediateSnap)
          .then(() => {
            ss.set('test', [1, 2, 3, 4, 5]);
            ss.apply('test', 'push', 6, 7, 8, 9);
            return ss.close();
          })
          .then(() => {
            ss = new SimpleStorage();
            return ss.open(dbname, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(JSON.stringify(ss.get('test'))).to.equal('[1,2,3,4,5,6,7,8,9]');
            ss.set('other', 5);
            ss.delete('test');
            return ss.close();
          })
          .then(() => {
            ss = new SimpleStorage();
            return ss.open(dbname, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(ss.get('other')).to.equal(5);
            expect(ss.get('test')).to.be.undefined;
            ss.set('other', { nested: [] });
            ss.set(['other', 'nested'], { nested: [] });
            ss.apply(['other', 'nested', 'nested'], 'push', 1, 2, 3);
            ss.apply(['other', 'nested', 'nested'], 'splice', 1, 1);
            return ss.close();
          })
          .then(() => {
            ss = new SimpleStorage();
            return ss.open(dbname, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(JSON.stringify(ss.get(['other', 'nested', 'nested']))).to.equal('[1,3]');
            return ss.close();
          });
      });
    });
  }
);