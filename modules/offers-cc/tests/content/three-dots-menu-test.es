import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';

context('Offers Hub three dots menu', function () {
  let subject;
  const settingsMenuSelector = '.setting-menu';
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
    });

    after(function () {
      subject.unload();
    });

    it('renders "Give Feedback"', function () {
      expect(subject.query(`${settingsMenuSelector} .feedback`)).to.exist;
      expect(subject.query(`${settingsMenuSelector} .feedback`))
        .to.have.text('offers_menu_give_feedback');
    });

    it('renders "Why do I see this?"', function () {
      expect(subject.query(`${settingsMenuSelector} .why`)).to.exist;
      expect(subject.query(`${settingsMenuSelector} .why`)).to.contain.text('why_see_this');
    });

    it('renders "Help"', function () {
      expect(subject.query(`${settingsMenuSelector} [data-telemetry-id="learn_more"]`)).to.exist;
      expect(subject.query(`${settingsMenuSelector} [data-telemetry-id="learn_more"]`))
        .to.contain.text('Sitemap_Facebook_Help');
    });

    it('"Help" contains a link to the support page', function () {
      expect(subject.query(`${settingsMenuSelector} [data-telemetry-id="learn_more"] a`))
        .to.exist;
      expect(subject.query(`${settingsMenuSelector} [data-telemetry-id="learn_more"] a`)
        .getAttribute('href')).to.equal('https://cliqz.com/support');
    });
  });

  context('click on three dots menu icon', function () {
    beforeEach(async function () {
      subject = new Subject();
      await subject.load();
      await subject.pushData(target, {
        noVoucher: true,
      });
      subject.query('.setting').click();
      await waitFor(() =>
        subject.query(settingsMenuSelector).classList.contains('show'));
    });

    afterEach(function () {
      subject.unload();
    });

    it('click second time -> menu removed', async function () {
      subject.query('.setting').click();
      await waitFor(() => expect(subject.query(settingsMenuSelector)).to.not.have.class('show'));
    });
  });
});
