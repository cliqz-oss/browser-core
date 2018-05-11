var expect = chai.expect;

export default describeModule("autocomplete/url-compare",
  function () {
    return {
    }
  },
  function () {
    describe('sameUrls', function () {
      it('returns same if identical', function () {
        var url = 'http://www.facebook.com/';
        expect(this.module().default.sameUrls(url, url)).to.be.true;
      });

      it('returns same if identical except www', function () {
        var url1 = 'http://facebook.com/';
        var url2 = 'http://www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns same if identical except http', function () {
        var url1 = 'http://www.facebook.com/';
        var url2 = 'https://www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns same if identical except no scheme', function () {
        var url1 = 'www.facebook.com/';
        var url2 = 'https://www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns same if identical except no scheme and no www', function () {
        var url1 = 'facebook.com/';
        var url2 = 'https://www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns same if identical except country code in domain', function () {
        var url1 = 'de.facebook.com/';
        var url2 = 'www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns same if identical except country code in path', function () {
        var url1 = 'www.facebook.com/de';
        var url2 = 'www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns same if identical except country code in domain facebook-style', function () {
        var url1 = 'de-de.facebook.com/';
        var url2 = 'www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns same if identical except trailing slash', function () {
        var url1 = 'http://www.facebook.com';
        var url2 = 'http://www.facebook.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.true;
      });

      it('returns not same if different domain', function () {
        var url1 = 'http://www.facebook.com/';
        var url2 = 'http://www.google.com/';
        expect(this.module().default.sameUrls(url1, url2)).to.be.false;
      });
    });
  }
);
