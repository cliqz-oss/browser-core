import {
  clearIntervals,
  expect,
  waitFor
} from '../../core/test-helpers';
import Subject from './local-helpers';
import {
  dataNewOffer,
  dataNewOffer1
} from './fixtures/offers';

context('Offers Hub Interaction tests for removing offer', function () {
  let subject;
  let data;
  const target = 'cliqz-offers-cc';
  const offerSelector = '#cqz-vouchers-wrapper .voucher-wrapper';

  context('with four offers', function () {
    before(function () {
      subject = new Subject();
      return subject.load().then(function () {
        data = dataNewOffer;
        return subject.pushData(target, data);
      })
        .then(() => {
          // click on 'three dots' and wait till popup is open
          subject.query('.logo-wrapper button.setting').click();
          return waitFor(function () {
            return subject.query('.logo-wrapper').classList.contains('menu-opened');
          });
        })
        .then(() => {
          // click on popup to remove offer and wait till feedback window is shown
          subject.query('.settings [data-menu-type="delete"]').click();
          return waitFor(() => subject.query('.voucher-wrapper').classList.contains('active'));
        })
        .then(() => {
          // click on close button for feedback and wait till the offer is hidden
          subject.query('#close-feedback').click();
          return waitFor(() => subject.queryAll(offerSelector).length !== 4);
        });
    });

    after(function () {
      subject.unload();
      clearIntervals();
    });

    it('three offers are rendered', function () {
      expect(subject.queryAll(offerSelector)).to.have.length(3);
    });

    it('for each offer benefit is rendered', function () {
      subject.queryAll(offerSelector).forEach(function (offer, i) {
        expect(offer.querySelector('.overview .benefit')).to.exist;
        expect(offer.querySelector('.overview .benefit'))
          .to.contain.text(data.vouchers[i + 1].template_data.benefit);
      });
    });

    it('for each offer headline is rendered', function () {
      subject.queryAll(offerSelector).forEach(function (offer, i) {
        expect(offer.querySelector('.overview .headline')).to.exist;
        expect(offer.querySelector('.overview .headline'))
          .to.contain.text(data.vouchers[i + 1].template_data.headline);
      });
    });

    it('for each offer logo is rendered', function () {
      subject.queryAll(offerSelector).forEach(function (offer) {
        expect(offer.querySelector('.logo-wrapper .logo')).to.exist;
      });
    });

    it('for each offer nothing else is rendered', function () {
      subject.queryAll(offerSelector).forEach(function (offer) {
        expect(subject.getComputedStyleOfElement(offer.querySelector('.details')).overflow)
          .to.equal('hidden');
        expect(subject.getComputedStyleOfElement(offer.querySelector('.settings')).display)
          .to.equal('none');
      });
    });
  });

  context('with only one offer', function () {
    before(function () {
      subject = new Subject();
      return subject.load().then(function () {
        data = dataNewOffer1;
        return subject.pushData(target, data);
      });
    });

    after(function () {
      subject.unload();
      clearIntervals();
    });

    it('sends message after deleting the offer', function () {
      subject.query('.logo-wrapper button.setting').click();
      return waitFor(function () {
        return subject.query('.logo-wrapper').classList.contains('menu-opened');
      })
        .then(() => {
          // click on popup to remove offer and wait till feedback window is shown
          subject.query('.settings [data-menu-type="delete"]').click();
          return waitFor(() => subject.query('.voucher-wrapper').classList.contains('active'));
        })
        .then(() => {
          // click on close button for feedback and wait till message is sent
          subject.query('#close-feedback').click();
          return waitFor(() => subject.messages.find(message => message.message.action === 'getEmptyFrameAndData'));
        })
        .then((message) => {
          expect(message).to.have.nested.property('message.data').that.is.empty;
        });
    });
  });
});
