/* global chai */
/* global describeModule */


export default describeModule('offers-v2/offers/offers-status',
  () => ({
  }),
  () => {
    describe('general tests', function () {
      let OfferStatus;
      beforeEach(function () {
        OfferStatus = this.module().default;
      });

      describe('#basics', function () {
        context('/validity checks', function () {
          let osh;
          beforeEach(function () {
            osh = new OfferStatus();
          });

          it('/check unknown', function () {
            chai.expect(osh.getOfferStatus('x')).eql('unknown');
            chai.expect(osh.getOfferStatus('x2')).eql('unknown');
          });

          it('/check active inactive obsolete', function () {
            const statusData = {
              x1: 'active',
              x2: 'inactive',
              x3: 'obsolete'
            };
            osh.loadStatusFromObject(statusData);
            chai.expect(osh.getOfferStatus('x1')).eql('active');
            chai.expect(osh.getOfferStatus('x2')).eql('inactive');
            chai.expect(osh.getOfferStatus('x3')).eql('obsolete');
            chai.expect(osh.getOfferStatus('x4')).eql('unknown');
          });
        });
      });
    });
  });
