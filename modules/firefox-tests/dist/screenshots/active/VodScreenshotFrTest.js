var backup, lang = 'fr';

TESTS.VodScreenshotFrTest = prepareScreenshotTest({
    emails: [
    ],
    subject: '[testing] fr VOD screenshots',
    width: 1024,
    name: 'VodScreenshotTestFr',
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
