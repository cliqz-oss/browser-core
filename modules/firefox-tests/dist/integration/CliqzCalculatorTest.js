/* global: $cliqzResults */

var expect = chai.expect;

DEPS.CliqzCalculatorTest = [];
TESTS.CliqzCalculatorTest = function() {
  function getResultString() {
    return $cliqzResults().find(".result").find("#calc-answer")[0].textContent.trim();
  }

  function getUnitBaseString() {
    return $cliqzResults().find(".result").find(".expression")[0].firstChild.textContent.trim();
  }

  describe('Calculator and unit converter integration', function() {
    context("Calculator simple - 2*3333.2", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("2*3333.2");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '6.666,4', 'default': '6,666.4'}));
      });

      xit('Should have copy message', function() {
        expect($cliqzResults().find(".result").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Unit converter simple - 1m to mm", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("1m to mm");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '1.000 mm', 'default': '1,000 mm'}));
      });

      xit('Should have base-unit conversion in localized format', function() {
        expect(getUnitBaseString()).to.equal(getLocaliseString({'de': '1 m = 1.000 mm', 'default': '1 m = 1,000 mm'}));
      });

      xit('Should have copy message', function() {
        expect($cliqzResults().find(".result").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Unit converter language specific - 1 mile to m", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("1 mile to m");  // 1.609,34 m
        return waitForPopup();
      });


      xit('Unit base line should show 1 meile = ... in German browser, and 1 mile = ... in English browser', function() {
        expect(getUnitBaseString().split("=")[0].trim()).to.equal(getLocaliseString({'de': '1 meile', 'default': '1 mile'}))
      });
    });

    context("Unit converter singular/plural unit term - 1m to mile", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("1 km to mile");
        return waitForPopup();
      });


      it('Result should show 0,621 meilen in German browser, and 0.621 miles in English browser', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '0,621 meilen', 'default': '0.621 miles'}));
      });
    });

    context("Calculator simple DE format - 2*3222,2", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("2*3222,2");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '6.444,4', 'default': '64,444'}));
      });

      xit('Should have copy message', function() {
        expect($cliqzResults().find(".result").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Calculator simple DE format - 1.500,2 + 2000,3", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("1.500,2 + 2000,3");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '3.500,5', 'default': '20,004.5'}));
      });

      xit('Should have copy message', function() {
        expect($cliqzResults().find(".result").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Calculator simple DE format - 10,2 + 1.000,00", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("10,2 + 1.000,00");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '1.010,2', 'default': '103'}));
      });

      xit('Should have copy message', function() {
        expect($cliqzResults().find(".result").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Calculator simple DE format - 1001,1 + 1.1", function() {
      beforeEach(function() {
        respondWith({results: []});
        fillIn("1001,1 + 1.1");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '1.012,1', 'default': '10,012.1'}));
      });

      xit('Should have copy message', function() {
        expect($cliqzResults().find(".result").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });
  });
};
