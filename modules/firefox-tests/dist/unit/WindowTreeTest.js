DEPS.WindowTree = ["core/utils"];
TESTS.WindowTree = function(CliqzUtils) {
  var System = CliqzUtils.getWindow().CLIQZ.System,
      WindowTree = System.get('platform/antitracking/http-request-context').WindowTree;


  describe('http-request-context.WindowTree', function() {

    var wt;

    beforeEach(function() {
        wt = new WindowTree();
    });

    it('has a no args constructor', function() {
      chai.expect(wt).to.not.be.undefined;
    });

    describe('getWindowByID', function() {

      it('returns undefined when no args are passed', function() {
        chai.expect(wt.getWindowByID()).to.be.undefined;
      });

      it('returns undefined for non existant window IDs', function() {
        chai.expect(wt.getWindowByID(5)).to.be.undefined;
      });

      it('returns undefined for non integer argument', function() {
        chai.expect(wt.getWindowByID('2')).to.be.undefined;
      });

    });

    describe('addRootWindow', function() {

      it('adds a window spec at the given window id', function() {
        var testUrl = 'test url';
        wt.addRootWindow(4, testUrl);
        var node = wt.getWindowByID(4);
        chai.expect(node.id).to.equal(4);
        chai.expect(node.top).to.be.true;
        chai.expect(node.url).to.equal(testUrl);
      });

      it('overrides the previous entry for the window id', function() {
        wt.addRootWindow(5, 'url1');
        var node = wt.getWindowByID(5);
        wt.addRootWindow(5, 'url2');
        chai.expect(wt.getWindowByID(5)).to.not.equal(node);
        chai.expect(wt.getWindowByID(5).url).to.equal('url2');
      });

      it('removes previous tree from this node', function() {
        wt.addRootWindow(11, 'url1');
        wt.addLeafWindow(12, 11, 'url2');

        wt.addRootWindow(11, 'url3');
        chai.expect(wt.getWindowByID(12)).to.be.undefined;
      });
    });

    describe('addLeafWindow', function() {

      it('is an orphan when parent does not exist', function() {
        wt.addLeafWindow(1, 2);
        chai.expect(wt.getWindowByID(2)).to.be.undefined;
        var w = wt.getWindowByID(1)
        chai.expect(w.id).to.equal(1);
        chai.expect(w.url).to.be.undefined;
        chai.expect(w.top).to.be.false;
        chai.expect(w.parent).to.equal(2);
        chai.expect(w.orphan).to.be.true;
      });

      it('is not an orphan when parent exists', function() {
        wt.addRootWindow(2);
        wt.addLeafWindow(1, 2);
        var w = wt.getWindowByID(1)
        chai.expect(w.id).to.equal(1);
        chai.expect(w.url).to.be.undefined;
        chai.expect(w.top).to.be.false;
        chai.expect(w.parent).to.equal(2);
        chai.expect(w.orphan).to.be.falsy;
      });

      it('does not overwrite if window = parent', function() {
        wt.addRootWindow(3, 'root');
        wt.addLeafWindow(3, 3, 'leaf');

        chai.expect(wt.getWindowByID(3).url).to.equal('root');
      });

    });

    describe('addWindowAction', function() {

      it('does not add if window already exists', function() {
        wt.addRootWindow(2, 'root');
        wt.addWindowAction(2, 3, 'winaction');

        var w = wt.getWindowByID(2);
        chai.expect(w.url).to.equal('root');
        chai.expect(w.origin).to.be.falsy;
      });

      it('does not add if parent does not exist', function() {
        wt.addWindowAction(3, 2);
        chai.expect(wt.getWindowByID(3)).to.be.undefined;
        chai.expect(wt.getWindowByID(2)).to.be.undefined;
      });

      it('adds window with origin attribute', function() {
        wt.addRootWindow(1);
        wt.addWindowAction(2, 1, 'leaf', 7);

        var w = wt.getWindowByID(2);
        chai.expect(w.id).to.equal(2);
        chai.expect(w.top).to.be.falsy;
        chai.expect(w.parent).to.equal(1);
        chai.expect(w.origin).to.equal(7);
      });
    });

  });
}
