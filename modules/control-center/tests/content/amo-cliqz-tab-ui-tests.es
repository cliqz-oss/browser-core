import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {dataOn, dataOff} from './fixtures/amo-cliqz-tab';

describe("Control Center: AMO, Cliqz tab UI tests", function () {
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  })

  after(function () {
    subject.unload();
    clearIntervals();
  });

  function cliqzTabUiTests(data) {
    it("renders cliqz tab box", function () {
      chai.expect(subject.query('.amo #cliqz-tab')).to.not.be.null;
    });

    it('renders info button', function () {
      chai.expect(subject.query('.amo #cliqz-tab .title .infobutton')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '.amo #cliqz-tab .title > span';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('Cliqz Tab');
    });

    it('renders switch', function () {
      chai.expect(subject.query('.amo #cliqz-tab .title .switches .cqz-switch-box')).to.exist;
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('Cliqz tab on', function () {
    before(() => {
      return subject.pushData(dataOn);
    });

    cliqzTabUiTests(dataOn);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('.amo #cliqz-tab .cqz-switch-box').background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.not.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.equal('none');
      chai.expect(subject.query(onSelector).textContent.trim()).to.equal('control-center-switch-on')
    });
  });

  describe('Cliqz tab off', function () {
    before(() => {
      return subject.pushData(dataOff);
    });

    cliqzTabUiTests(dataOff);

    it('renders correct colour of switch', function () {
      chai.expect(subject.getComputedStyle('.amo #cliqz-tab .cqz-switch-box').background).to.contain('rgb(246, 112, 87)');
    });

    it('renders "OFF"', function () {
      const onSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-on"]';
      const offSelector = '.amo #cliqz-tab .switches [data-i18n="control-center-switch-off"]';
      chai.expect(subject.query(onSelector)).to.exist;
      chai.expect(subject.query(offSelector)).to.exist;
      chai.expect(subject.getComputedStyle(onSelector).display).to.equal('none');
      chai.expect(subject.getComputedStyle(offSelector).display).to.not.equal('none');
      chai.expect(subject.query(offSelector).textContent.trim()).to.equal('control-center-switch-off')
    });
  });
})
