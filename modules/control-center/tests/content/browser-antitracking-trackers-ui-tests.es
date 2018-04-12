import {
  clearIntervals,
  expect,
  waitFor
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { generateData } from './fixtures/antitracking-trackers';

function trackersTests(amo) {
  const data = generateData(amo);
  const target = 'cliqz-control-center';
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load().then(function () {
      return subject.pushData(target, data);
    });
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  it('anti-tracking section exists', function () {
    expect('#anti-tracking.antitracker.setting').to.exist;
    expect('#anti-tracking .hover-highlighted').to.exist;
  });

  describe('click on Anti-tracking', function () {
    beforeEach(function () {
      subject.query('#anti-tracking .hover-highlighted').click();
      return waitFor(() => subject.query('#anti-tracking.antitracker.setting').classList.contains('active'));
    });

    it('the section with tracking companies appeared', function () {
      const sectionSelector = '.active-window-tracking';
      expect(subject.query(sectionSelector)).to.exist;
      expect(subject.getComputedStyle(sectionSelector).display).to.not.equal('none');
    });

    it('renders title with trackers', function () {
      const titleSelector = '.active-window-tracking #companies-title [data-i18n="control-center-trackers"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-trackers');
    });

    it('renders back arrow', function () {
      expect(subject.query('.active-window-tracking #companies-title #Page-1'));
    });

    it('renders bottom part about private data', function () {
      expect(subject.query('.active-window-tracking #bottom-part')).to.exist;
    });

    it('renders text about private data', function () {
      const descriptionSelector = '.active-window-tracking #bottom-part [data-i18n="control-center-datapoints"]';
      expect(subject.query(descriptionSelector)).to.exist;
      expect(subject.query(descriptionSelector).textContent.trim()).to.equal('control-center-datapoints');
    });

    it('renders correct number of data points', function () {
      const dataPointsSelector = '.active-window-tracking #bottom-part .counter #count';
      expect(subject.query(dataPointsSelector)).to.exist;
      expect(subject.query(dataPointsSelector).textContent.trim())
        .to.equal(data.module.antitracking.totalCount.toString());
    });

    it('renders shield', function () {
      expect(subject.query('.active-window-tracking #bottom-part .counter #shield')).to.exist;
    });

    it('renders box for "Strict"', function () {
      expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour')).to.exist;
    });

    it('box is unchecked', function () {
      expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(false);
    });

    it('renders "Strict"', function () {
      const strictSelector = '.active-window-tracking #bottom-part .squaredFour [data-i18n="control-center-check-strict"]';
      expect(subject.query(strictSelector)).to.exist;
      expect(subject.query(strictSelector).textContent.trim()).to.equal('control-center-check-strict');
    });

    it('renders button "Clear Tracking Cache"', function () {
      const buttonSelector = '.active-window-tracking #bottom-part .clear-Tracking-Cache-Button';
      const textSelector = '.active-window-tracking #bottom-part .clear-Tracking-Cache-Button [data-i18n="control-center-clear-trCache"]';
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(textSelector)).to.exist;
      expect(subject.query(textSelector).textContent.trim()).to.equal('control-center-clear-trCache');
    });

    context('list of trackers is correct', function () {
      it('renders correct amount of trackers', function () {
        const companiesSelector = '.active-window-tracking #companies .setting-accordion-section';
        expect(subject.queryAll(companiesSelector).length)
          .to.equal(data.module.antitracking.trackersList.companiesArray.length);
      });

      it('for each company renders name', function () {
        data.module.antitracking.trackersList.companiesArray.forEach((_, i) => {
          const companiesSelector = '.active-window-tracking #companies .setting-accordion-section';
          const titleSelector = '.setting-accordion-section-title';
          expect(subject.queryAll(companiesSelector)[i].querySelector(titleSelector)).to.exist;
          expect(subject.queryAll(companiesSelector)[i].querySelector(titleSelector).textContent
            .trim()).to.equal(data.module.antitracking.trackersList.companiesArray[i].name);
        });
      });

      it('for each company renders correct amount of data points', function () {
        data.module.antitracking.trackersList.companiesArray.forEach((_, i) => {
          const companiesSelector = '.active-window-tracking #companies .setting-accordion-section';
          const countSelector = '.company-count';
          expect(subject.queryAll(companiesSelector)[i].querySelector(countSelector)).to.exist;
          expect(subject.queryAll(companiesSelector)[i].querySelector(countSelector))
            .to.have.text(data.module.antitracking.trackersList.companiesArray[i].count.toString());
        });
      });
    });
  });
}

describe('Control Center: Anti-Tracking, page with trackers', function () {
  trackersTests(false);
});

describe('Control Center: AMO Anti-Tracking, page with trackers tests', function () {
  trackersTests(true);
});
