/* global chai, describeModule */

const nonNumeric = ['', 'ithinkthereis1numberhere', '1240abcd'];
const mostlyNumeric = ['4902', '1024x768'];

const probData = require('../../../antitracking/prob.json');

export default describeModule('antitracking/hash', function () {
  return {
    'core/resource-loader': {
      default: class MockResourceLoader {},
    },
  };
},
function () {
  describe('#isMostlyNumeric', function () {
    let isMostlyNumeric;

    beforeEach(function () {
      isMostlyNumeric = this.module().isMostlyNumeric;
    });

    nonNumeric.forEach((testInput) => {
      it(`returns false for "${testInput}"`, function () {
        chai.expect(isMostlyNumeric(testInput)).to.eql(false);
      });
    });

    mostlyNumeric.forEach((testInput) => {
      it(`returns true for "${testInput}"`, function () {
        chai.expect(isMostlyNumeric(testInput)).to.eql(true);
      });
    });
  });

  describe('HashProb', function () {
    let hashProb;

    beforeEach(function () {
      const HashProb = this.module().HashProb;
      hashProb = new HashProb();
      hashProb._update(probData);
    });

    const notHash = [
      '', 'Firefox', 'cliqz.com', // a url
      'anti-tracking',
      'front/ng',
      'javascript',
      'callback'
    ];

    const hashes = [
      '04C2EAD03B',
      '54f5095c96e',
      'B62a15974a93',
      '22163a4ff903',
      '468x742',
      '1021x952',
      '1024x768',
      '1440x900'
    ];

    notHash.forEach(function (str) {
      it(`'${str}' is not a hash`, function () {
        chai.expect(hashProb.isHash(str)).to.be.false;
      });
    });

    hashes.forEach(function (str) {
      it(`'${str}' is a hash`, function () {
        chai.expect(hashProb.isHash(str)).to.be.true;
      });
    });
  });
}
);
