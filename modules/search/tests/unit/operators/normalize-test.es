/* global chai, describeModule */

const mock = {
  'core/url': {
    tryDecodeURI: u => u,
    urlStripProtocol: () => 'STRIPPED_URL',
    cleanMozillaActions: url => [undefined, url],
  },
  'core/url-info': {
    URLInfo: {
      get: () => ({
        hostname: 'domain',
        generalDomain: 'domain'
      })
    }
  }
};

const prototype = {
  url: '',
  href: '',
  friendlyUrl: '',
  title: '',
  description: undefined,
  extra: {},
  image: undefined,
  kind: [],
  style: undefined,
  provider: undefined,
  template: undefined,
  suggestion: undefined,
  text: undefined,
  type: undefined,
  meta: {
    isIncomplete: undefined,
    triggerMethod: undefined,
    domain: undefined,
    score: undefined,
    url: undefined,
    subType: {},
    latency: undefined,
    backendCountry: undefined,
  },
};

export default describeModule('search/operators/normalize',
  () => mock,
  () => {
    describe('#normalize', function () {
      let normalize;

      beforeEach(function () {
        normalize = this.module().default;
      });

      it('normalizes instant results', function () {
        const legacy = {
          data: {},
          provider: 'instant',
          text: 'query',
          type: 'supplementary-search',
        };

        const normalized = {
          links: [
            {
              ...prototype,
              provider: 'instant',
              text: 'query',
              title: undefined,
              type: 'supplementary-search',
              meta: {
                ...prototype.meta,
                level: 0,
                type: 'main',
                url: 'STRIPPED_URL',
                domain: 'domain',
                host: 'STRIPPED_URL',
                hostAndPort: 'STRIPPED_URL',
                port: undefined,
              },
            },
          ]
        };

        return chai.expect(normalize(legacy)).to.deep.equal(normalized);
      });
    });
  });
