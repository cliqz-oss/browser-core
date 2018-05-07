import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject
} from './helpers';

describe('Fresh tab offer notification UI', function () {
  const mockedOffers = [
    {
      offer_id: '123',
      offer_info: {
        ui_info: {
          template_data: {
            call_to_action: {
              target: '',
              text: 'Teilnehmen',
              url: 'https://umfrage.cliqz.com/index.php/545662?lang=de"='
            },
            conditions: 'Diese Umfrage dauert ca. 5 Minuten und ist anonym.',
            desc: 'Hallo! Wir möchten sehr gerne etwas über Ihre Meinung zum Cliqz-Browser erfahren.',
            logo_url: 'https://cdn.cliqz.com/extension/offers/survey-icon.svg',
            title: 'Cliqz-Umfrage',
            validity: 1519967709,
            voucher_classes: ''
          }
        }
      },
      validity: 1519967709
    }
  ];

  let subject;
  let newsConfig;

  before(function () {
    subject = new Subject();
    newsConfig = clone(defaultConfig);
    newsConfig.response.componentsState.news.visible = true;
    subject.respondsWith(newsConfig);

    subject.respondsWith({
      module: 'freshtab',
      action: 'getOffers',
      response: mockedOffers
    });

    subject.respondsWith({
      module: 'offers-v2',
      action: 'processRealEstateMessages',
      response: {}
    });

    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      }
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });
  });

  after(function () {
    subject.shouldHaveNoErrors();
    clearIntervals();
  });

  context('when one offer message is available', function () {
    before(function () {
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('the offer is visible', function () {
      const offerSelector = '.offer-middle-notification';
      expect(subject.query(offerSelector)).to.exist;
    });
  });
});
