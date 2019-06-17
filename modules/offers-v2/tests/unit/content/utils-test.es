/* global chai */
/* global describeModule */

export default describeModule('offers-v2/content/utils',
  () => ({
  }),
  () => {
    describe('amazon prime detection', function () {
      let isAmazonDomain;

      beforeEach(function () {
        isAmazonDomain = this.module().isAmazonDomain;
      });

      context('isAmazonDomain', function () {
        it('recognize important amazon domains', () => {
          chai.expect(isAmazonDomain('amazon.com')).to.be.true;
          chai.expect(isAmazonDomain('www.amazon.de')).to.be.true;
          chai.expect(isAmazonDomain('amazon.co.uk')).to.be.true;
          chai.expect(isAmazonDomain('AMAZON.FR')).to.be.true;
        });

        it('avoid confusion with amazon-like domains', () => {
          chai.expect(isAmazonDomain('amazonxco.de')).to.be.false;
          chai.expect(isAmazonDomain('my-amazon.de')).to.be.false;
        });

        it('third-level domain cases', () => {
          chai.expect(isAmazonDomain('service.amazon.com.mx')).to.be.true;
          chai.expect(isAmazonDomain('service.amazon.comm.mx')).to.be.false;
          chai.expect(isAmazonDomain('amazon.badguy.com')).to.be.false;
        });
      });
    });
  });
