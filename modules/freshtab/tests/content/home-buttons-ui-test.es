import { expect } from '../../core/test-helpers';
import {
  defaultConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab buttons UI', function () {
  const homeButtonSelector = '#cliqz-home';
  const historyButtonSelector = '#cliqz-history';
  const settingsButtonSelector = '#settings-btn';
  let subject;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();
    subject.respondsWith(defaultConfig);

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [
          {
            title: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            id: 's3.amazonaws.com/cdncliqz/update/browser/latest.html',
            url: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            displayTitle: 's3.amazonaws.com',
            custom: false,
            logo: {
              text: 's3',
              backgroundColor: 'c3043e',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #c3043e;color:#fff;'
            }
          }
        ],
        custom: []
      },
    });
  });

  context('rendered in wide window', function () {
    before(function () {
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    describe('renders home icon', function () {
      it('successfully', function () {
        expect(subject.query(homeButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        expect(subject.getComputedStyle(subject.query(homeButtonSelector)).display).to.not.equal('none');
      });


      it('with correct text', function () {
        expect(subject.query(homeButtonSelector)).to.have.text('Home');
      });

      it('with the link which is empty string', function () {
        expect(subject.query(homeButtonSelector).href)
          .to.equal('');
      });
    });

    describe('renders history icon', function () {
      it('successfully', function () {
        expect(subject.query(historyButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        expect(subject.getComputedStyle(subject.query(historyButtonSelector)).display)
          .to.not.equal('none');
      });

      it('with correct text', function () {
        expect(subject.query(historyButtonSelector)).to.have.text('History');
      });

      it('with correct link', function () {
        expect(subject.query(historyButtonSelector).href)
          .to.contain('/cliqz-history/index.html');
      });
    });

    describe('renders settings icon', function () {
      it('successfully', function () {
        expect(subject.query(settingsButtonSelector)).to.exist;
      });

      it('not hidden', function () {
        expect(subject.getComputedStyle(subject.query(settingsButtonSelector)).display)
          .to.not.equal('none');
      });

      it('with correct text', function () {
        expect(subject.query(settingsButtonSelector)).to.have.text('Settings');
      });
    });
  });

  context('rendered in narrow window', function () {
    before(function () {
      return subject.load({ iframeWidth: 300 });
    });

    after(function () {
      subject.unload();
    });

    describe('renders home icon', function () {
      it('successfully', function () {
        expect(subject.query(homeButtonSelector)).to.exist;
      });

      it('hidden', function () {
        expect(subject.getComputedStyle(subject.query(homeButtonSelector)).display).to.equal('none');
      });
    });

    describe('renders history icon', function () {
      it('successfully', function () {
        expect(subject.query(historyButtonSelector)).to.exist;
      });

      it('hidden', function () {
        expect(subject.getComputedStyle(subject.query(historyButtonSelector)).display).to.equal('none');
      });
    });

    describe('renders settings icon', function () {
      it('successfully', function () {
        expect(subject.query(settingsButtonSelector)).to.exist;
      });

      it('hidden', function () {
        expect(subject.getComputedStyle(subject.query(settingsButtonSelector)).display).to.equal('none');
      });
    });
  });
});
