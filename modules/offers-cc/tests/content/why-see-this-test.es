import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';

context('Offers Hub Why do I see this', function () {
  let subject;
  const settingsMenuSelector = '.setting-menu';
  const whyOffersSelector = '.why-offers';
  const target = 'cliqz-offers-cc';

  context('UI', function () {
    before(async function () {
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, {
        noVoucher: true,
      });
      subject.query('.setting').click();
      await waitFor(() =>
        subject.query(settingsMenuSelector).classList.contains('show'));
      subject.query('.why').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    after(function () {
      subject.unload();
    });

    it('renders "close" button', function () {
      expect(subject.query(`${whyOffersSelector} button.close`)).to.exist;
    });

    it('renders "Why do I see these offers"', function () {
      expect(subject.query(`${whyOffersSelector} h2`)).to.exist;
      expect(subject.query(`${whyOffersSelector} h2`)).to.have.text('why_see_these_offers');
    });

    it('renders text about offers', function () {
      expect(subject.query(`${whyOffersSelector} [data-i18n="why_offers_text"]`)).to.exist;
      expect(subject.query(`${whyOffersSelector} [data-i18n="why_offers_text"]`)).to.have.text('why_offers_text');
    });

    it('renders link "Learn more"', function () {
      expect(subject.query(`${whyOffersSelector} a`)).to.exist;
      expect(subject.query(`${whyOffersSelector} a`)).to.have.text('attrack_help');
      expect(subject.query(`${whyOffersSelector} a`).href)
        .to.equal('https://cliqz.com/cliqz-angebote');
    });
  });

  context('interaction', function () {
    before(async function () {
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, {
        noVoucher: true,
      });
      subject.query('.setting').click();
      await waitFor(() =>
        subject.query(settingsMenuSelector).classList.contains('show'));
      subject.query('.why').click();
      await waitFor(() =>
        subject.messages.find(message => message.message.action === 'resize'));
    });

    after(function () {
      subject.unload();
    });

    context('click on "close" button', function () {
      beforeEach(async function () {
        subject.query(`${whyOffersSelector} button.close`).click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
      });

      it('window is closed', function () {
        expect(subject.query(whyOffersSelector)).to.not.have.class('show');
      });
    });
  });
});
