import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';

context('Offers Hub Why do I see this', function () {
  let subject;
  const target = 'cliqz-offers-cc';

  async function init() {
    const s = new Subject();
    await s.load();
    await s.pushData(target, { noVoucher: true });
    s.query('.header__menu').click();
    await waitFor(() => s.query('.header__menu').classList.contains('header__menu-active'));
    s.query('.menu__item').click();
    await waitFor(() => s.messages.find(message => message.message.action === 'resize'));
    return s;
  }

  context('UI', function () {
    before(async function () { subject = await init(); });
    after(function () { subject.unload(); });

    it('renders "close" button', function () {
      expect(subject.query('.why-do-i-see__cross')).to.exist;
    });

    it('renders "Why do I see these offers"', function () {
      expect(subject.query('.why-do-i-see__title')).to.exist;
      expect(subject.query('.why-do-i-see__title')).to.have.text('why_see_these_offers');
    });

    it('renders text about offers', function () {
      expect(subject.query('.why-do-i-see__description')).to.exist;
      expect(subject.query('.why-do-i-see__description')).to.have.text('why_offers_text');
    });

    it('renders link "Learn more"', function () {
      expect(subject.query('.why-do-i-see__link')).to.exist;
      expect(subject.query('.why-do-i-see__link')).to.have.text('learn_more');
      expect(subject.query('.why-do-i-see__link').getAttribute('href')).to.exist;
      expect(subject.query('.why-do-i-see__link').getAttribute('href')).to.equal('https://myoffrz.com/fuer-nutzer');
    });
  });

  context('interaction', function () {
    before(async function () { subject = await init(); });
    after(function () { subject.unload(); });

    context('click on "close" button', function () {
      beforeEach(async function () {
        subject.query('.why-do-i-see__cross').click();
        await waitFor(() =>
          subject.messages.find(message => message.message.action === 'resize'));
      });

      it('window is closed', function () {
        expect(subject.query('.header__menu')).to.not.have.class('header__menu-active');
      });
    });
  });
});
