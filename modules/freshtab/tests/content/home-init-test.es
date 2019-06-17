import { expect } from '../../core/test-helpers';
import {
  defaultConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Initializing Freshtab', function () {
  let subject;
  let messages;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWith(defaultConfig);
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();
    subject.startListening();

    messages = subject.messagesByAction;
    return subject.load();
  });

  after(function () {
    subject.unload();
  });

  it('loads Freshtab', function () {
    const iframes = document.getElementsByTagName('iframe');
    expect(iframes[iframes.length - 1].contentWindow.location.href)
      .to.contain('freshtab/home.html');
  });

  it('does not render the settings panel closed', function () {
    const settingsPanelSelector = '#settings-panel';
    expect(subject.query(settingsPanelSelector)).to.not.exist;
  });

  it('sends a "home > show" telemetry signal', function () {
    expect(messages.has('sendTelemetry')).to.equal(true);

    const telemetrySignals = messages.get('sendTelemetry');
    let count = 0;

    expect(telemetrySignals.length).to.be.above(0);

    count = telemetrySignals.filter(({ args: [arg] }) => (
      arg !== undefined
      && arg.type === 'home'
      && arg.action === 'show'
      && (typeof arg.favorite_count !== 'undefined')
      && (typeof arg.is_favorites_on !== 'undefined')
      && (typeof arg.is_news_on !== 'undefined')
      && (typeof arg.is_search_bar_on !== 'undefined')
      && (typeof arg.is_topsites_on !== 'undefined')
      && (typeof arg.topsite_count !== 'undefined')
      && (typeof arg.is_stats_on !== 'undefined')
    )).length;

    expect(count).to.equal(1);
  });
});
