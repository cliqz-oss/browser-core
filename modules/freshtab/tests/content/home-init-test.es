/* global document */

import {
  clearIntervals,
  defaultConfig,
  expect,
  Subject
} from './helpers';

describe('Initializing Fresh tab', function () {
  let subject;
  let listener;
  let messages;

  before(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });
    subject.respondsWith(defaultConfig);
    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      },
    });
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });

    return subject.load().then(() => {
      // Keep track of received messages
      messages = new Map();
      listener = function (msg) {
        if (!messages.has(msg.action)) {
          messages.set(msg.action, []);
        }
        messages.get(msg.action).push(msg);
      };
      subject.chrome.runtime.onMessage.addListener(listener);
    });
  });

  after(function () {
    subject.chrome.runtime.onMessage.removeListener(listener);
    subject.unload();
    clearIntervals();
  });

  it('loads Fresh tab', function () {
    const iframes = document.getElementsByTagName('iframe');
    expect(iframes[iframes.length - 1].contentWindow.location.href)
      .to.contain('freshtab/home.html');
  });

  it('renders the settings panel closed', function () {
    const settingsPanelSelector = '#settings-panel';
    expect(subject.query(settingsPanelSelector)).to.exist;
    expect(subject.query(settingsPanelSelector).className).to.not.contain('visible');
  });

  /* TODO */
  xit('sends a "home > show" telemetry signal', function () {
    expect(messages.has('sendTelemetry')).to.equal(true);

    const telemetrySignals = messages.get('sendTelemetry');
    let signalExist = false;
    let count = 0;

    telemetrySignals.for(function (item) {
      if ((item.args[0].type === 'home') &&
          (item.args[0].action === 'show') &&
          (typeof item.args[0].favorite_count !== 'undefined') &&
          (typeof item.args[0].topsite_count !== 'undefined') &&
          (typeof item.args[0].is_favorites_on !== 'undefined') &&
          (typeof item.args[0].is_topsites_on !== 'undefined') &&
          (typeof item.args[0].is_search_bar_on !== 'undefined') &&
          (typeof item.args[0].is_news_on !== 'undefined') &&
          (typeof item.args[0].topnews_count !== 'undefined')) {
            signalExist = true;
            count += 1;
      }
    });

    expect(signalExist).to.be.true;
    expect(count).to.equal(1);
  });
});
