const expect = chai.expect;

export default describeModule('human-web/bloom-filter',
  () => ({
    'core/config': {
      default: {
        settings: {
          CDN_BASEURL: 'http://cdn-baseurl.cliqz.test'
        }
      }
    },
  }),
  () => {
    describe('BloomFilter', function () {
      let CliqzBloomFilter;
      let BloomFilter;

      beforeEach(function () {
        CliqzBloomFilter = this.module().default;
        BloomFilter = CliqzBloomFilter.BloomFilter;
      });

      it('should pass simple testSingle tests', function() {
        const uut = new BloomFilter(new Array(101), 7);

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
  }
);
