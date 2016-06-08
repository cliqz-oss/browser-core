var backup, lang = 'de';

TESTS.VodScreenshotDeTest = prepareScreenshotTest({
    emails: [
    ],
    subject: '[testing] de VOD screenshots',
    width: 1024,
    name: 'VodScreenshotTestDe',
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
