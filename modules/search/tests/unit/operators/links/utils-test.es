const mock = {
};

export default describeModule('search/operators/links/utils',
  () => mock,
  () => {
    describe('#mapLinksByUrl', function() {
      let mapLinksByUrl;

      beforeEach(function () {
        mapLinksByUrl = this.module().mapLinksByUrl;
      });

      it('maps empty links', function() {
        chai.expect(mapLinksByUrl([])).to.be.empty;
      });

      it('maps 1 URL', function() {
        const links = [{
          kind: ['m'],
          meta: { url: 'cliqz.de' },
        }];
        const map = mapLinksByUrl(links);
        chai.expect(map).to.have.key('cliqz.de');
        chai.expect(map.get('cliqz.de')).to.deep.equal(links[0]);
      });

      it('maps multiple URLs', function() {
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
        const map = mapLinksByUrl(links);
        chai.expect(map).to.have.keys('cliqz.de', 'ghostery.com', 'mozilla.org');
        chai.expect(map.get('cliqz.de')).to.deep.equal(links[0]);
        chai.expect(map.get('ghostery.com')).to.deep.equal(links[1]);
        chai.expect(map.get('mozilla.org')).to.deep.equal(links[2]);
      });
    });
    describe('#getDuplicateLinks', function() {
      let getDuplicateLinks;

      beforeEach(function () {
        getDuplicateLinks = this.module().getDuplicateLinks;
      });

      it('works with empty links', function() {
        chai.expect(getDuplicateLinks([], [])).to.be.empty;
        chai.expect(getDuplicateLinks([{ meta: { url: 'cliqz.com' } }], [])).to.be.empty;
        chai.expect(getDuplicateLinks([], [{ meta: { url: 'cliqz.com' } }])).to.be.empty;
      });

      it('gets duplicates from target links', function() {
        const link1 = { kind: ['a'], meta: { url: 'cliqz.com' } };
        const link2 = { kind: ['b'], meta: { url: 'cliqz.com' } };
        const link3 = { kind: ['c'], meta: { url: 'ghostery.com' } };
        chai.expect(getDuplicateLinks([link1], [link2, link3])).to.deep.equal([link1]);
      });
    });
    describe('#hasMainLink', function() {
      let hasMainLink;

      beforeEach(function () {
        hasMainLink = this.module().hasMainLink;
      });

      it('works with empty links', function() {
        chai.expect(hasMainLink({ links: [] })).to.be.false;
      });

      it('returns true if there is a main link', function() {
        chai.expect(hasMainLink({ links: [
          { meta: { type: 'main' } },
        ] })).to.be.true;
        chai.expect(hasMainLink({ links: [
          { meta: { type: 'main' } },
          { meta: { type: 'other' } },
        ] })).to.be.true;
      });

      it('returns false if there is no main link', function() {
        chai.expect(hasMainLink({ links: [
          { meta: { type: 'other' } },
        ] })).to.be.false;
      });
    });
  },
);
