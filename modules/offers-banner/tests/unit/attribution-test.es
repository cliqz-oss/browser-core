/* global describeModule */
/* global chai */
const tldts = require('tldts-experimental');
const punycode = require('punycode');

const URL_TO_CHANNEL = {
  'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test': { channel: 'external-test', subchannel: null },
  'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip': { channel: 'external-chip', subchannel: null },
  'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus': { channel: 'external-focus', subchannel: null },
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test': { channel: 'external-test', subchannel: null },
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-chip': { channel: 'external-chip', subchannel: null },
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus': { channel: 'external-focus', subchannel: null },
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus&subchannel=MKTG1': { channel: 'external-focus', subchannel: 'MKTG1' },
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-chip&subchannel=MKTG22': { channel: 'external-chip', subchannel: 'MKTG22' },
  'https://chrome.random.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus': { channel: null, subchannel: null },
  'https://chrome.random.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-chip&subchannel=MKTG22': { channel: null, subchannel: null },
  'https://myoffrz.net': { channel: null, subchannel: null },
  'https://sparalarm.chip.de/?utm_source=external-chip': { channel: 'external-chip', subchannel: null },
  'https://sparalarm.chip.de/?utm_source=external-focus': { channel: 'external-focus', subchannel: null },
  'https://sparalarm.chip.de/?utm_source=external-chip&utm_campaign=campaign_22': { channel: 'external-chip', subchannel: 'campaign_22' },
  'https://sparalarm.chip.de/?utm_source=external-focus&utm_campaign=campaign_22': { channel: 'external-focus', subchannel: 'campaign_22' },
  'https://sparalarm.chip.de/?utm_source=external-cliqz&utm_campaign=campaign_22': { channel: 'external-cliqz', subchannel: 'campaign_22' },
};

// used to have expected returns
let STATES = {};

export default describeModule('offers-banner/attribution',
  () => ({
    'platform/lib/tldts': tldts,
    'platform/lib/punycode': {
      default: punycode,
    },
    'platform/tabs': {
      getCurrentTab: () => new Promise((resolve) => {
        resolve(STATES.getCurrentTab || []);
      }),
      query: () => new Promise((resolve) => {
        resolve(STATES.query || []);
      })
    },
    'platform/globals': {
      chrome: {
        history: {
          search: (_, resolve) => resolve(STATES.history || [])
        }
      }
    }
  }),
  () => {
    describe('/test getChannelFromURLs', () => {
      let getChannelFromURLs;

      beforeEach(async function () {
        getChannelFromURLs = this.module().getChannelFromURLs;
      });

      it('should translate urls to right channels', async () => {
        Object.keys(URL_TO_CHANNEL).forEach((k) => {
          chai.expect(getChannelFromURLs([k]).channel).to.eql(URL_TO_CHANNEL[k].channel);
          chai.expect(getChannelFromURLs([k]).subchannel).to.eql(URL_TO_CHANNEL[k].subchannel);
        });
      });
    });

    describe('/test guessDistributionChannel', async () => {
      let guessDistributionChannel;

      beforeEach(async function () {
        guessDistributionChannel = this.module().guessDistributionChannel;
        STATES = {};
      });

      describe('Homepage landings', async () => {
        it('current tab chip', async () => {
          STATES.getCurrentTab = { url: 'https://sparalarm.chip.de/?utm_source=external-chip' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          chai.expect((await guessDistributionChannel()).sub).to.eql('');
        });

        it('current tab focus', async () => {
          STATES.getCurrentTab = { url: 'https://sparalarm.chip.de/?utm_source=external-focus' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
          chai.expect((await guessDistributionChannel()).sub).to.eql('');
        });

        it('current tab chip with campaign', async () => {
          STATES.getCurrentTab = { url: 'https://sparalarm.chip.de/?utm_source=external-chip&utm_campaign=campaign_22' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          chai.expect((await guessDistributionChannel()).sub).to.eql('campaign_22');
        });

        it('current tab focus with campaign', async () => {
          STATES.getCurrentTab = { url: 'https://sparalarm.chip.de/?utm_source=external-focus&utm_campaign=campaign_22' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
          chai.expect((await guessDistributionChannel()).sub).to.eql('campaign_22');
        });

        it('current tab random', async () => {
          STATES.getCurrentTab = { url: 'https://sparalarm.chip.de/?utm_source=external-cliqz&utm_campaign=campaign_22' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('');
          chai.expect((await guessDistributionChannel()).sub).to.eql('');
        });

        it('history', async () => {
          STATES.history = { url: 'https://sparalarm.chip.de/?utm_source=external-cliqz&utm_campaign=campaign_22' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('');
          chai.expect((await guessDistributionChannel()).sub).to.eql('');
        });

        it('query', async () => {
          STATES.query = { url: 'https://sparalarm.chip.de/?utm_source=external-cliqz&utm_campaign=campaign_22' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('');
          chai.expect((await guessDistributionChannel()).sub).to.eql('');
        });

        it('all', async () => {
          STATES.getCurrentTab = { url: 'https://sparalarm.chip.de/?utm_source=external-chip&utm_campaign=campaign_1' };
          STATES.query = [{ url: 'https://sparalarm.chip.de/?utm_source=external-focus&utm_campaign=campaign_2' }];
          STATES.history = [{ url: 'https://sparalarm.chip.de/?utm_source=external-focus&utm_campaign=campaign_3' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          chai.expect((await guessDistributionChannel()).sub).to.eql('campaign_1');
        });

        it('website prio', async () => {
          STATES.getCurrentTab = { url: 'https://sparalarm.chip.de/?utm_source=external-chip&utm_campaign=campaign_1' };
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          chai.expect((await guessDistributionChannel()).sub).to.eql('campaign_1');
        });

        it('history prio', async () => {
          STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/' };
          STATES.history = [{ url: 'https://sparalarm.chip.de/?utm_source=external-focus&utm_campaign=campaign_12' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
          chai.expect((await guessDistributionChannel()).sub).to.eql('campaign_12');
        });
      });

      describe('Complex States', async () => {
        it('no matches', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com/' };
          chai.expect((await guessDistributionChannel()).clean).to.eql('');
        });

        it('all matches', async () => {
          STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
        });

        it('unknown source first match', async () => {
          STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('');
        });

        it('not secure url -> fallback to next', async () => {
          STATES.getCurrentTab = { url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
        });

        it('all not secure url', async () => {
          STATES.getCurrentTab = { url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' };
          STATES.query = [{ url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('');
        });

        it('multiple open tabs - prio first', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' }
          ];
          chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
        });

        it('multiple open tabs - unknown first', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [
            { url: 'http://myoffrz.com' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' }
          ];
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
        });

        it('multiple history - unknown first', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [];
          STATES.history = [
            { url: 'http://myoffrz.com' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' },
          ];
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
        });

        it('multiple history - priority', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [];
          STATES.history = [
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' },
          ];
          chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
        });

        it('subchannel matches first', async () => {
          STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip&subchannel=BF1' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          chai.expect((await guessDistributionChannel()).sub).to.eql('BF1');
        });

        it('subchannel matches second', async () => {
          STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus&subchannel=BF1' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          chai.expect((await guessDistributionChannel()).sub).to.eql('');
        });
      });

      describe('/CurrentTab', async () => {
        describe('/AMO', async () => {
          it('/known url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          });

          it('/known url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-chip' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-test' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });
        });

        describe('/Chrome', async () => {
          it('/known url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
          });

          it('/known url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' };
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });
        });
      });

      describe('/Open Tabs', async () => {
        beforeEach(async function () {
          STATES.getCurrentTab = { url: 'https://myoffrz.com/' };
        });
        describe('/AMO', async () => {
          it('/known url with known channel', async () => {
            STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          });

          it('/known url with unknown channel', async () => {
            STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-chip' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });
        });

        describe('/Chrome', async () => {
          it('/known url with known channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
          });

          it('/known url with unknown channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });
        });
      });

      describe('/History', async () => {
        beforeEach(async function () {
          STATES.getCurrentTab = { url: 'https://myoffrz.com/' };
        });

        describe('/AMO', async () => {
          it('/known url with known channel', async () => {
            STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('chip');
          });

          it('/known url with unknown channel', async () => {
            STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-chip' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });
        });

        describe('/Chrome', async () => {
          it('/known url with known channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('focus');
          });

          it('/known url with unknown channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect((await guessDistributionChannel()).clean).to.eql('');
          });
        });
      });
    });
  });
