/* globals describeModule, chai */

export default describeModule('webrequest-pipeline/webrequest-context',
  () => ({
    'webrequest-pipeline/logger': {
      default: {
        log() {},
        error() {},
        debug() {},
      },
    },
    'core/url-info': {
      URLInfo: {
        get: url => ({ url }),
      },
    },
  }),
  () => {
    describe('#createWebRequestContext', () => {
      const BASE_DETAILS = {
        url: 'https://domain.com',
        isPrivate: false,
        isRedirect: false,
      };

      let createWebRequestContext;

      beforeEach(function () {
        createWebRequestContext = this.module().createWebRequestContext;
      });

      it('does not change sourceUrl if it exists', () => {
        chai.expect(createWebRequestContext({
          ...BASE_DETAILS,
          sourceUrl: 'source',
          frameAncestors: [{ url: 'top' }],
        }, {
          getSourceURL() { return 'page'; }
        }).sourceUrl).to.eql('source');
      });

      it('populates sourceUrl with ancestors if available', () => {
        chai.expect(createWebRequestContext({
          ...BASE_DETAILS,
          frameAncestors: [{ url: 'top' }],
        }).sourceUrl).to.eql('top');

        chai.expect(createWebRequestContext({
          ...BASE_DETAILS,
          frameAncestors: [{ url: 'not top' }, { url: 'top' }],
        }).sourceUrl).to.eql('top');
      });

      it('populates sourceUrl with pageStore if ancestors is empty', () => {
        chai.expect(createWebRequestContext({
          ...BASE_DETAILS,
          frameAncestors: [],
        }, {
          getSourceURL() { return 'page'; }
        }).sourceUrl).to.eql('page');
      });

      it('populates sourceUrl with pageStore if ancestors is undefined', () => {
        chai.expect(createWebRequestContext(BASE_DETAILS, {
          getSourceURL() { return 'page'; }
        }).sourceUrl).to.eql('page');
      });
    });
  });
