require('./retention-helpers')({
  name: 'retention-weekly',
  tests: ({
    mockActivity,
    compareSignal,
    generateAnalysisResults,
  }) => {
    it('has 10 signals', async () => {
      mockActivity([]);
      compareSignal(
        await generateAnalysisResults(),
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1, // initial offset
      );
    });

    it('generates starting at first week of the year (1)', async () => {
      mockActivity(['2017-12-30']);
      compareSignal(
        await generateAnalysisResults(),
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1, // initial offset
      );
    });

    it('generates starting at first week of the year (2)', async () => {
      mockActivity(['2017-12-30', '2017-12-29']);
      compareSignal(
        await generateAnalysisResults(),
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1, // initial offset
      );
    });

    it('generates starting at first week of the year (7)', async () => {
      mockActivity([
        '2017-12-31',
        '2017-12-30',
        '2017-12-29',
        '2017-12-28',
        '2017-12-27',
        '2017-12-26',
        '2017-12-25',
      ]);
      compareSignal(
        await generateAnalysisResults(),
        [7, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1, // initial offset
      );
    });
  },
});
