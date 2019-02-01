/* global chai */

const refId = 'refId';
let getRefId;

require('../telemetry-schemas-test-helpers')({
  name: 'analysis.cliqzForFriends.interactions',
  metrics: [
    'metrics.cliqzForFriends.visit',
    'metrics.cliqzForFriends.click',
    'metrics.cliqzForFriends.upload',
  ],
  mock: {
    'core/kord/inject': {
      default: {
        module() {
          return {
            isEnabled: () => true,
            async action(action) {
              if (action === 'getRefId') {
                return getRefId();
              }
              return Promise.reject(new Error(`No such action: ${action}`));
            },
          };
        },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    beforeEach(() => {
      getRefId = () => Promise.resolve('refId');
    });

    it('does not send signal if no visit', async () => {
      chai.expect(await generateAnalysisResults({})).to.eql([]);
    });

    it('counts one visit', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.cliqzForFriends.visit': [{ page: 'dashboard' }],
      })).to.eql([{ refId, clicks: {}, uploads: {}, visits: { dashboard: 1 } }]);
    });

    it('counts two visits', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.cliqzForFriends.visit': [{ page: 'dashboard' }, { page: 'dashboard' }],
      })).to.eql([{ refId, clicks: {}, uploads: {}, visits: { dashboard: 2 } }]);
    });

    it('counts visits to multiple pages', async () => {
      chai.expect(
        await generateAnalysisResults({
          'metrics.cliqzForFriends.visit': [
            { page: 'dashboard' },
            { page: 'faq' },
            { page: 'dashboard' },
            { page: 'redeem' },
          ],
        })
      ).to.eql([
        { refId, clicks: {}, uploads: {}, visits: { dashboard: 2, faq: 1, redeem: 1 } },
      ]);
    });

    it('clicks one element', async () => {
      chai.expect(
        await generateAnalysisResults({
          'metrics.cliqzForFriends.click': [
            { target: 'redeem' },
          ],
        })
      ).to.eql([
        { refId, clicks: { redeem: 1 }, uploads: {}, visits: {} },
      ]);
    });

    it('clicks multiple elements', async () => {
      chai.expect(
        await generateAnalysisResults({
          'metrics.cliqzForFriends.click': [
            { target: 'redeem' },
            { target: 'delete-campaign' },
            { target: 'redeem' },
          ],
        })
      ).to.eql([
        { refId, clicks: { 'delete-campaign': 1, redeem: 2 }, uploads: {}, visits: {} },
      ]);
    });

    it('uploads video', async () => {
      chai.expect(
        await generateAnalysisResults({
          'metrics.cliqzForFriends.upload': [
            { type: 'video' },
          ],
        })
      ).to.eql([
        { refId, clicks: {}, uploads: { video: 1 }, visits: {} },
      ]);
    });

    it('uploads audio', async () => {
      chai.expect(
        await generateAnalysisResults({
          'metrics.cliqzForFriends.upload': [
            { type: 'audio' },
          ],
        })
      ).to.eql([
        { refId, clicks: {}, uploads: { audio: 1 }, visits: {} },
      ]);
    });

    it('uploads multiple medias', async () => {
      chai.expect(
        await generateAnalysisResults({
          'metrics.cliqzForFriends.upload': [
            { type: 'video' },
            { type: 'audio' },
            { type: 'audio' },
            { type: 'video' },
            { type: 'video' },
          ],
        })
      ).to.eql([
        { refId, clicks: {}, uploads: { audio: 2, video: 3 }, visits: {} },
      ]);
    });

    it('aggregated a bit of everything', async () => {
      chai.expect(
        await generateAnalysisResults({
          'metrics.cliqzForFriends.upload': [
            { type: 'audio' },
            { type: 'video' },
          ],
          'metrics.cliqzForFriends.click': [
            { target: 'campaign-create' },
            { target: 'campaign-edit' },
            { target: 'campaign-view' },
            { target: 'delete-campaign' },
            { target: 'redeem' },
            { target: 'ref-url-copy' },
            { target: 'remove-multimedia' },
            { target: 'sharing-email' },
            { target: 'sharing-facebook' },
            { target: 'sharing-linkedin' },
            { target: 'sharing-reddit' },
            { target: 'sharing-twitter' },
            { target: 'sharing-wordpress' },
            { target: 'submit-refId' },
          ],
          'metrics.cliqzForFriends.visit': [
            { page: 'dashboard' },
            { page: 'faq' },
            { page: 'redeem' },
            { page: 'shop' },
            { page: 'settings' },
          ],
        })
      ).to.eql([
        { refId,
          clicks: {
            'campaign-create': 1,
            'campaign-edit': 1,
            'campaign-view': 1,
            'delete-campaign': 1,
            redeem: 1,
            'ref-url-copy': 1,
            'remove-multimedia': 1,
            'sharing-email': 1,
            'sharing-facebook': 1,
            'sharing-linkedin': 1,
            'sharing-reddit': 1,
            'sharing-twitter': 1,
            'sharing-wordpress': 1,
            'submit-refId': 1,
          },
          uploads: { audio: 1, video: 1 },
          visits: { dashboard: 1, faq: 1, redeem: 1, settings: 1, shop: 1 } },
      ]);
    });

    it('succeeds if refId cannot be retrieved', async () => {
      getRefId = () => Promise.reject(new Error('Error!'));
      chai.expect(await generateAnalysisResults({
        'metrics.cliqzForFriends.visit': [{ page: 'dashboard' }],
      })).to.eql([{ clicks: {}, uploads: {}, visits: { dashboard: 1 } }]);
    });
  },
});
