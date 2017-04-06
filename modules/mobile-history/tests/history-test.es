export default describeModule('mobile-history/history',
  function () {
    return {
      'core/utils': {
        default: {
          getDetailsFromUrl() { },
          getLogoDetails() { }
        }
      },
      'core/storage': { default: function () { } },
      'platform/window': {
        default: {
          document: {
            body: { },
            documentElement: { },
            getElementById() { return { addEventListener() { } }; }
          }
        }
      }
    };
  },
  function () {
    describe('Dynamic Loading', function () {
      const time = Date.now();
      const mockedHistory = [ { title: 'Test', timestamp: time, url: 'http://www.hellomagazine.com/' }];
      let _done;
      context('There\'s still more history', function () {
        beforeEach(function () {
          this.module().default.RECORD_LIMIT = 1;
          this.module().default.displayData = data => {
            chai.expect(data.length).to.equal(2);
            chai.expect(data[0].url).to.be.not.ok;
            chai.expect(data[0].query).to.be.not.ok;
            chai.expect(data[0].date).to.be.ok;
            chai.expect(data[1].query).to.be.not.ok;
            chai.expect(data[1].url).to.equal('http://www.hellomagazine.com/');
            _done();
          };
          this.deps('core/storage').default.prototype.getObject = () => {
            return [ { query: 'Test query', timestamp: time - 10 } ];
          };
        });
        it('Should not load queries earlier than the earliest history record', function (done) {
          _done = done;
          this.module().default.showHistory(mockedHistory);
        });
      });

      context('all history is rendered', function () {
        beforeEach(function () {
          this.module().default.RECORD_LIMIT = 2;
          this.module().default.displayData = data => {
            chai.expect(data.length).to.equal(4);
            chai.expect(data[0].url).to.be.not.ok;
            chai.expect(data[0].query).to.be.not.ok;
            chai.expect(data[0].date).to.be.ok;
            chai.expect(data[1].query).to.be.ok;
            chai.expect(data[1].query).to.equal('Test query 2');
            chai.expect(data[2].query).to.be.ok;
            chai.expect(data[2].query).to.equal('Test query');
            chai.expect(data[3].url).to.be.ok;
            chai.expect(data[3].url).to.equal('http://www.hellomagazine.com/');
            _done();
          };
          this.deps('core/storage').default.prototype.getObject = () => {
            return [
              { query: 'Test query', timestamp: time - 10 },
              { query: 'Test query 2', timestamp: time - 20 }
            ];
          };
        });
        it('Should load the rest of the queries', function (done) {
          _done = done;
          this.module().default.showHistory(mockedHistory);
        });
      });
    });
  }
);
