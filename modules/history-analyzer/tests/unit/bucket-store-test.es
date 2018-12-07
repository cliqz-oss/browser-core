/* global chai */
/* global describeModule */

const adblocker = require('@cliqz/adblocker');
const mockDexie = require('../../core/unit/utils/dexie');

export default describeModule('history-analyzer/bucket-store',
  () => ({
    ...mockDexie,
    'platform/lib/adblocker': {
      default: adblocker,
    },
  }),
  () => {
    let kv;

    beforeEach(function () {
      const BucketStore = this.module().default;
      kv = new BucketStore('tests');
      return kv.init();
    });

    afterEach(() => kv.destroy());

    describe('#set', () => {
      it('inserts an element', () =>
        kv.set('foo', 'bar')
          .then(() => chai.expect(kv.get('foo')).to.be.eql('bar'))
          .then(() => chai.expect(kv.size).to.be.eql(1)));

      it('replaces an existing element', () =>
        kv.set('foo', 'bar')
          .then(() => kv.set('foo', 'baz'))
          .then(() => chai.expect(kv.get('foo')).to.be.eql('baz'))
          .then(() => chai.expect(kv.size).to.be.eql(1)));
    });

    describe('#update', () => {
      it('when key does not exist', () =>
        kv.update('foo', (v) => {
          chai.expect(v).to.be.undefined;
          return 'bar';
        }).then(() => chai.expect(kv.get('foo')).to.be.eql('bar'))
          .then(() => chai.expect(kv.size).to.be.eql(1)));

      it('when key already exists', () =>
        kv.set('foo', 'bar')
          .then(() => kv.update('foo', (v) => {
            chai.expect(v).to.be.eql('bar');
            chai.expect(kv.size).to.be.eql(1);
            return 'baz';
          }))
          .then(() => chai.expect(kv.get('foo')).to.be.eql('baz'))
          .then(() => chai.expect(kv.size).to.be.eql(1)));
    });

    it('#deleteDataOlderThan', () =>
      Promise.all([
        kv.set(1, 'foo'),
        kv.set(2, 'foo'),
        kv.set(3, 'foo'),
        kv.set(4, 'foo'),
        kv.set(5, 'foo'),
        kv.set(6, 'foo'),
      ]).then(() => kv.deleteDataOlderThan(4))
        .then(() => chai.expect(kv.keys()).to.be.eql([
          4, 5, 6
        ])));
  });
