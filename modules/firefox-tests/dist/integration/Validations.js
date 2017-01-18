
DEPS.Validations = ['core/utils'];
TESTS.Validations = function (CliqzUtils) {
  describe('Should load locales', function () {
    this.retries(1);

    it('should load locales files', () => {
      // Load locales
      const langs = ['de', 'en', 'fr'];
      const locales = new Map();
      langs.forEach((lang) => {
        CliqzUtils.loadResource(
          `${CliqzUtils.LOCALE_PATH}/${lang}/cliqz.json`,
          req => locales.set(lang, req.response),
        );
      });

      return waitFor(function () {
        return locales.size === langs.length;
      }).then(() => { chai.expect(locales.size).to.equal(langs.length); });
    });
  });
};
