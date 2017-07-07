/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names */

export default describeModule('market-analysis/common/regex_helper',
  () => ({}),
  () => {
    describe('test function', () => {
      let RegexHelper;

      beforeEach(function () {
        RegexHelper = this.module().default;
      });

      it('check test function', () => {
        const regexHelper = new RegexHelper();
        let regexStr = 'abc';
        const url = 'https://www.google.com/abc/xyz?werwe=2323';
        chai.expect(regexHelper.test(regexStr, url)).eql(true);

        regexStr = 'abcxyz';
        chai.expect(regexHelper.test(regexStr, url)).eql(false);

        regexStr = 'google\\.com';
        chai.expect(regexHelper.test(regexStr, url)).eql(true);
      });
    });
  }
);
