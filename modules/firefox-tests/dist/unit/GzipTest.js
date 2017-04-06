"use strict"

DEPS.GzipTest = ["core/utils"];
TESTS.GzipTest = function(CliqzUtils) {

  describe('gzip', function() {
    var gzip;

    beforeEach( function() {
      return CliqzUtils.getWindow().CLIQZ.System.import('core/gzip').then( function(mod) {
        gzip = mod;
      });
    });

    describe('compress', function() {
      var testString = 'hello',
          compressed;

      beforeEach( function() {
        compressed = gzip.compress(testString);
      });

      it('converts a string into a Uint8Array', function() {
        chai.expect(compressed).to.be.a('Uint8Array');
      });

      describe('decompress', function() {
        var decompressed;

        beforeEach( function() {
          decompressed = gzip.decompress(compressed);
        });

        it('converts back to the original value', function() {
          chai.expect(gzip.decompress(compressed)).to.eql(testString);
        });
      });

    });

  });
}

TESTS.GzipTest.MIN_BROWSER_VERSION = 38;
