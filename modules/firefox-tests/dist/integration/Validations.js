/* global chai, TESTS, waitFor */

/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

TESTS.Validations = function (CliqzUtils) {
  describe('Should load locales', function () {
    this.retries(1);

    it('should load locales files', function () {
      // Load locales
      const langs = ['de', 'en', 'fr'];
      const locales = new Map();
      langs.forEach(function (lang) {
        CliqzUtils.loadResource(
          `${CliqzUtils.LOCALE_PATH}/${lang}/messages.json`,
          req => locales.set(lang, req.response)
        );
      });

      return waitFor(function () {
        return locales.size === langs.length;
      }).then(() => { chai.expect(locales.size).to.equal(langs.length); });
    });
  });
};
