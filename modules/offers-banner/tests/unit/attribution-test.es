/* global describeModule */
/* global chai */
const tldts = require('tldts');
const punycode = require('punycode');

const URL_TO_CHANNEL = {
  'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test': 'external-test',
  'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip': 'external-chip',
  'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus': 'external-focus',
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test': 'external-test',
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-chip': 'external-chip',
  'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus': 'external-focus',
  'https://chrome.random.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus': null,
  'https://myoffrz.net': null
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
          chai.expect(getChannelFromURLs([k])).to.eql(URL_TO_CHANNEL[k]);
        });
      });
    });

    describe('/test guessDistributionChannel', async () => {
      let guessDistributionChannel;

      beforeEach(async function () {
        guessDistributionChannel = this.module().guessDistributionChannel;
        STATES = {};
      });

      describe('Complex States', async () => {
        it('no matches', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com/' };
          chai.expect(await guessDistributionChannel()).to.eql('');
        });

        it('all matches', async () => {
          STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect(await guessDistributionChannel()).to.eql('chip');
        });

        it('unknown source first match', async () => {
          STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect(await guessDistributionChannel()).to.eql('');
        });

        it('not secure url -> fallback to next', async () => {
          STATES.getCurrentTab = { url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' };
          STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect(await guessDistributionChannel()).to.eql('focus');
        });

        it('all not secure url', async () => {
          STATES.getCurrentTab = { url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' };
          STATES.query = [{ url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' }];
          STATES.history = [{ url: 'http://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-random' }];
          chai.expect(await guessDistributionChannel()).to.eql('');
        });

        it('multiple open tabs - prio first', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' }
          ];
          chai.expect(await guessDistributionChannel()).to.eql('focus');
        });

        it('multiple open tabs - unknown first', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [
            { url: 'http://myoffrz.com' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' }
          ];
          chai.expect(await guessDistributionChannel()).to.eql('chip');
        });

        it('multiple history - unknown first', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [];
          STATES.history = [
            { url: 'http://myoffrz.com' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' },
          ];
          chai.expect(await guessDistributionChannel()).to.eql('chip');
        });

        it('multiple history - priority', async () => {
          STATES.getCurrentTab = { url: 'https://myoffrz.com' };
          STATES.query = [];
          STATES.history = [
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-focus' },
            { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' },
          ];
          chai.expect(await guessDistributionChannel()).to.eql('focus');
        });
      });

      describe('/CurrentTab', async () => {
        describe('/AMO', async () => {
          it('/known url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-chip' };
            chai.expect(await guessDistributionChannel()).to.eql('chip');
          });

          it('/known url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test' };
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-chip' };
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-test' };
            chai.expect(await guessDistributionChannel()).to.eql('');
          });
        });

        describe('/Chrome', async () => {
          it('/known url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' };
            chai.expect(await guessDistributionChannel()).to.eql('focus');
          });

          it('/known url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' };
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' };
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.getCurrentTab = { url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' };
            chai.expect(await guessDistributionChannel()).to.eql('');
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
            chai.expect(await guessDistributionChannel()).to.eql('chip');
          });

          it('/known url with unknown channel', async () => {
            STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-chip' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.query = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });
        });

        describe('/Chrome', async () => {
          it('/known url with known channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect(await guessDistributionChannel()).to.eql('focus');
          });

          it('/known url with unknown channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.query = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
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
            chai.expect(await guessDistributionChannel()).to.eql('chip');
          });

          it('/known url with unknown channel', async () => {
            STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-chip' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.history = [{ url: 'https://addons.mozilla.org/en-US/firefox/addon/cliqz/?src=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });
        });

        describe('/Chrome', async () => {
          it('/known url with known channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect(await guessDistributionChannel()).to.eql('focus');
          });

          it('/known url with unknown channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with known channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-focus' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });

          it('/unknown url with unknown channel', async () => {
            STATES.history = [{ url: 'https://chrome.google.com/webstore/detail/cliqz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=external-test' }];
            chai.expect(await guessDistributionChannel()).to.eql('');
          });
        });
      });
    });
  });
