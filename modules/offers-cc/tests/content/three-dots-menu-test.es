import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';

context('Offers Hub three dots menu', function () {
  let subject;
  const target = 'cliqz-offers-cc';

  async function init() {
    const s = new Subject();
    await s.load();
    await s.pushData(target, { noVoucher: true });
    s.query('.header__menu').click();
    await waitFor(() => s.query('.header__menu').classList.contains('header__menu-active'));
    return s;
  }

  context('UI', function () {
    before(async function () { subject = await init(); });
    after(function () { subject.unload(); });

    it('renders "Why do I see this?"', function () {
      expect(subject.query('.menu__item')).to.exist;
      expect(subject.query('.menu__item')).to.contain.text('why_see_this');
    });

    it('renders "Help"', function () {
      expect([...subject.queryAll('.menu__item')][1]).to.exist;
      expect([...subject.queryAll('.menu__item')][1]).to.contain.text('help');
    });
  });

  context('click on three dots menu icon', function () {
    before(async function () { subject = await init(); });
    afterEach(function () { subject.unload(); });

    it('click second time -> menu removed', async function () {
      subject.query('.header__menu').click();
      await waitFor(() => expect(subject.query('.header__menu')).to.not.have.class('header__menu-active'));
    });
  });
});
