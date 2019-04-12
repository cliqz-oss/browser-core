/* global chai */
/* global describeModule */

const expect = chai.expect;
const crypto = require('crypto');
const _path = require('path');
const FSBuilder = require('./utils/fs');

const _fs = FSBuilder(_path);

export default describeModule('core/simple-storage',
  () => ({
    'core/helpers/md5': {
      default: data => crypto.createHash('md5').update(data).digest('hex'),
    },
    'core/fs': _fs,
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
        const dbname = `test${Math.round(Math.random() * 1000000000)}`;
        const dirName = 'StorageTests';
        const exactName = true;
        const immediateSnap = false;
        let ss = new SimpleStorage();

        return ss.open(dbname, dirName, exactName, immediateSnap)
          .then(() => {
            ss.set('test', [1, 2, 3, 4, 5]);
            ss.apply('test', 'push', 6, 7, 8, 9);
            return ss.flush().then(() => ss.close());
          })
          .then(() => {
            ss = new SimpleStorage();
            return ss.open(dbname, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(JSON.stringify(ss.get('test'))).to.equal('[1,2,3,4,5,6,7,8,9]');
            ss.set('other', 5);
            ss.delete('test');
            return ss.flush().then(() => ss.close());
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
            return ss.flush().then(() => ss.close());
          })
          .then(() => {
            ss = new SimpleStorage();
            return ss.open(dbname, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(JSON.stringify(ss.get(['other', 'nested', 'nested']))).to.equal('[1,3]');
            return ss.flush().then(() => ss.close());
          });
      });
    });
  });
