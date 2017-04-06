
const nonNumeric = ['', 'ithinkthereis1numberhere', '1240abcd'];
const mostlyNumeric = ['4902', '1024x768'];

export default describeModule("antitracking/hash", function () {
    return {
      'core/resource-loader': {},
    };
  },
  function () {
    describe('#isMostlyNumeric', function() {
      let isMostlyNumeric;

      beforeEach(function() {
        isMostlyNumeric = this.module().isMostlyNumeric;
      });

      nonNumeric.forEach((testInput) => {
        it(`returns false for "${testInput}"`, function() {
          chai.expect(isMostlyNumeric(testInput)).to.eql(false);
        });
      });

      mostlyNumeric.forEach((testInput) => {
        it(`returns true for "${testInput}"`, function() {
          chai.expect(isMostlyNumeric(testInput)).to.eql(true);
        });
      });

    });
  }
);
