let fetch = () => {};

const mock = {
  'core/url': {
    getDetailsFromUrl: url => ({ domain: 'domain' }),
    urlStripProtocol: url => 'STRIPPED_URL',
  }
};

const prototype = {
  url: undefined,
  href: undefined,
  title: '',
  description: undefined,
  extra: {},
  image: undefined,
  kind: undefined,
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
    url: undefined,
  },
};

export default describeModule('search/operators/normalize',
  () => mock,
  () => {
    describe('#normalize', function() {
      let normalize;

      beforeEach(function () {
        normalize = this.module().default;
      });

      it('normalizes instant results', function() {
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
              title: 'STRIPPED_URL',
              type: 'supplementary-search',
              meta: {
                ...prototype.meta,
                level: 0,
                type: 'main',
                url: 'STRIPPED_URL',
                domain: 'domain',
              },
            },
          ]
        };

        return chai.expect(normalize(legacy)).to.deep.equal(normalized);
      });
    });
  },
);
