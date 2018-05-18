/* globals describeModule, chai */

const expect = chai.expect;

export default describeModule('webrequest-pipeline/fetch-sanitizer',
  () => ({}),
  () => {

    describe('isSensitiveOriginHeader', function() {

      let isSensitiveOriginHeader;
      beforeEach(function () {
        isSensitiveOriginHeader = this.module().isSensitiveOriginHeader;
      });

      it('should filter sensitive "origin" header set by Firefox', function() {
        // in an actual request, it looks like this
        expect(isSensitiveOriginHeader('moz-extension://d3295586-47c5-81a0-8616-d95fa0c2a609')).to.be.true;

        // ... but filter anything that looks like an ID
        expect(isSensitiveOriginHeader('moz-extension://1234567890')).to.be.true;
      });

      it('should filter sensitive "origin" headers set by Chrome', function() {
        // in an actual request, it looks like this
        expect(isSensitiveOriginHeader('chrome-extension://kbaliphbmoieiljjlhognoddjdkklfmg')).to.be.true;

        // ... but filter anything that looks like an ID
        expect(isSensitiveOriginHeader('chrome-extension://1234567890')).to.be.true;
      });

      it('should not modify unrelated request headers', function() {
        expect(isSensitiveOriginHeader('http://www.example.test')).to.be.false;
      });
    });
  }
);
