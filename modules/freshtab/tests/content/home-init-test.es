import { expect } from '../../core/test-helpers';
import {
  defaultConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Initializing Fresh tab', function () {
  let subject;
  let listener;
  let messages;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWith(defaultConfig);
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();

    // Keep track of received messages
    messages = new Map();
    listener = function (msg) {
      if (!messages.has(msg.action)) {
        messages.set(msg.action, []);
      }
      messages.get(msg.action).push(msg);
    };
    subject.chrome.runtime.onMessage.addListener(listener);

    return subject.load();
  });

  after(function () {
    subject.chrome.runtime.onMessage.removeListener(listener);
    subject.unload();
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

  it('sends a "home > show" telemetry signal', function () {
    expect(messages.has('sendTelemetry')).to.equal(true);

    const telemetrySignals = messages.get('sendTelemetry');
    let count = 0;

    expect(telemetrySignals.length).to.be.above(0);

    count = telemetrySignals.filter(function (s) {
      return (
        s.args[0].type === 'home' &&
        s.args[0].action === 'show' &&
        (typeof s.args[0].favorite_count !== 'undefined') &&
        (typeof s.args[0].is_favorites_on !== 'undefined') &&
        (typeof s.args[0].is_news_on !== 'undefined') &&
        (typeof s.args[0].is_search_bar_on !== 'undefined') &&
        (typeof s.args[0].is_topsites_on !== 'undefined') &&
        (typeof s.args[0].topsite_count !== 'undefined')
      );
    }).length;

    expect(count).to.equal(1);
  });
});
