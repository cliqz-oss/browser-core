/* global chai, describeModule */

const expect = chai.expect;

export default describeModule('core/bloom-filter-packed',
  () => ({}),
  () => {
    describe('BloomFilterPacked', function () {
      let BloomFilter;

      beforeEach(function () {
        BloomFilter = this.module().default;
      });

      it('should pass simple testSingle tests', function () {
        const buffer = new ArrayBuffer(5 + (101 * 4));
        const view = new DataView(buffer);
        view.setUint32(0, 101, false);
        view.setUint8(4, 7, false);
        const uut = new BloomFilter(view.buffer);

        expect(uut.testSingle('x')).to.be.false;
        expect(uut.testSingle('y')).to.be.false;

        uut.addSingle('x');
        expect(uut.testSingle('x')).to.be.true;
        expect(uut.testSingle('y')).to.be.false;

        uut.addSingle('y');
        expect(uut.testSingle('x')).to.be.true;
        expect(uut.testSingle('y')).to.be.true;
      });
    });
  });
