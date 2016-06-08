var backup, lang = 'en';

TESTS.VodScreenshotEnTest = prepareScreenshotTest({
    emails: [
    ],
    subject: '[testing] en VOD screenshots',
    width: 1024,
    name: 'VodScreenshotTestEn',
    extraBefore: [
        function() {
            backup = fakeLanguage(lang);
        }
    ],
    extraAfter: [
        function() {
            restoreLanguage(backup);
        }
    ],
    upload: {
        dropdown_width: 786
    },
    queries: QUERIES.vod,
    test_groups: ['nightly']
});
