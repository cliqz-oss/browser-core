import {
  clearIntervals,
  expect,
  waitFor
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataNewOffer } from './fixtures/offers';

context('Offers Hub Interaction tests for one offer', function () {
  let subject;
  let data;
  const offerDetailsSelector = '#cqz-vouchers-holder li.voucher-wrapper.active .details';
  const target = 'cliqz-offers-cc';

  beforeEach(function () {
    subject = new Subject();
    return subject.load().then(function () {
      data = dataNewOffer;
      return subject.pushData(target, data);
    });
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  it('is rendered', function () {
    expect(subject.query(offerDetailsSelector)).to.exist;
  });

  context('code button', function () {
    const codeButtonSelector = '.promocode-wrapper button.copy-code';

    it('exists', function () {
      expect(subject.query(codeButtonSelector)).to.exist;
    });

    it('with the text \'copy code\'', function () {
      expect(subject.query(codeButtonSelector).textContent.trim())
        .to.equal('offers_hub_copy_btn');
    });

    context('click on the code button', function () {
      let execCommand;

      beforeEach(function () {
        execCommand = subject.iframe.contentWindow.document.execCommand;
        subject.iframe.contentWindow.document.execCommand = () => true;
        subject.query(codeButtonSelector).click();

        return waitFor(function () {
          return subject.query(codeButtonSelector).textContent.trim() !== 'offers_hub_copy_btn';
        });
      });

      afterEach(function () {
        subject.iframe.contentWindow.document.execCommand = execCommand;
      });

      it('renders \'code copied\'', function () {
        expect(subject.query(codeButtonSelector).textContent.trim())
          .to.equal('offers_hub_code_copy');
      });
    });
  });

  context('condition button', function () {
    const conditionButtonSelector = '.validity-wrapper .condition button';

    it('exists', function () {
      expect(subject.query(conditionButtonSelector)).to.exist;
    });
  });

  context('\'delete offer\' button', function () {
    const deleteButtonSelector = '.logo-wrapper button.setting';
    const deletePopupSelector = '.settings';

    it('exists', function () {
      expect(subject.query(deleteButtonSelector)).to.exist;
    });

    it('popup for deleting exists but not visible', function () {
      expect(subject.query(deletePopupSelector)).to.exist;
      expect(subject.getComputedStyle(deletePopupSelector).display)
        .to.equal('none');
    });

    context('click on the \'delete offer\' button', function () {
      beforeEach(function () {
        subject.query(deleteButtonSelector).click();

        return waitFor(function () {
          return subject.query('.logo-wrapper').classList.contains('menu-opened');
        });
      });

      it('renders popup for deleting offer', function () {
        expect(subject.query(deletePopupSelector)).to.exist;
        expect(subject.getComputedStyle(deletePopupSelector).display).to.equal('block');
        expect(subject.query(`${deletePopupSelector} [data-i18n="offers_hub_remove"]`)).to.exist;
        expect(subject.query(`${deletePopupSelector} [data-i18n="offers_hub_remove"]`)
          .textContent.trim()).to.equal('offers_hub_remove');
      });
    });
  });
});
