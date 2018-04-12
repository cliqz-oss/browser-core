
const mock = {
  'core/url': {},
};

export default describeModule('search/operators/results/utils',
  () => mock,
  () => {
    describe('#flattenLinks', function() {
      let flattenLinks;

      beforeEach(function () {
        flattenLinks = this.module().flattenLinks;
      });

      it('flattens empty results', function() {
        const results = [];
        chai.expect(flattenLinks(results)).to.be.empty;
      });

      it('flattens result with empty links', function() {
        const results = [{ links: [] }];
        chai.expect(flattenLinks(results)).to.be.empty;
      });

      it('flattens 1 result with 1 URL', function() {
        const links = [{
          kind: ['m'],
          meta: { url: 'cliqz.de' },
        }];
        const results = [{ links }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });

      it('flattens 1 result with multiple URLs', function() {
        const links = [
          {
            kind: ['m'],
            meta: { url: 'cliqz.de' },
          },
          {
            kind: ['m'],
            meta: { url: 'ghostery.com' },
          },
        ];
        const results = [{ links }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });

      it('flattens multiple results with 1 URL', function() {
        const links = [
          {
            kind: ['m'],
            meta: { url: 'cliqz.de' },
          },
          {
            kind: ['m'],
            meta: { url: 'ghostery.com' },
          },
        ];
        const results = [{ links: [links[0]] }, { links: [links[1]] }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });

      it('flattens multiple results with multiple URLs', function() {
        const links = [
          {
            kind: ['m'],
            meta: { url: 'cliqz.de' },
          },
          {
            kind: ['m'],
            meta: { url: 'ghostery.com' },
          },
          {
            kind: ['m'],
            meta: { url: 'mozilla.org' },
          },
        ];
        const results = [{ links: [links[0]] }, { links: [links[1], links[2]] }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });
    });
    describe('#getDuplicateLinksByUrl', function() {
      let getDuplicateLinksByUrl;

      beforeEach(function () {
        getDuplicateLinksByUrl = this.module().getDuplicateLinksByUrl;
      });

      it('finds and maps duplicate', function() {
        const link1 = { meta: { url: 'cliqz.de' }, kind: ['a'] };
        const link2 = { meta: { url: 'cliqz.de' }, kind: ['b'] };
        const results1 = [
          { links: [link1] },
        ];
        const results2 = [
          { links: [link2] },
        ];
        const map = getDuplicateLinksByUrl(results1, results2);
        chai.expect(map).to.have.key(link1.meta.url);
        chai.expect(map.get(link1.meta.url)).to.deep.equal(link1);
      });
    });
  },
);
