TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: [
    ],
    subject: '[testing] new dropdown screenshots',
    width: 1024,
    name: 'SmartCliqzScreenshotTest',
    upload: {
        dropdown_width: 786
    },
    queries: QUERIES.top.concat(
        QUERIES.smartcliqz).concat(
        QUERIES.thuy).concat(
        QUERIES.michel),
    test_groups: ['nightly']
});
