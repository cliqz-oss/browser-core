require('./retention-helpers')({
  name: 'retention-monthly',
  tests: ({
    mockActivity,
    compareSignal,
    generateAnalysisResults,
  }) => {
    it('generates 12 signals', async () => {
      mockActivity([]);
      compareSignal(
        await generateAnalysisResults(),
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1, // initial offset
      );
    });

    it('generates starting first at month of the year (1)', async () => {
      mockActivity(['2017-12-20']);
      compareSignal(
        await generateAnalysisResults(),
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1, // initial offset
      );
    });

    it('generates starting first at month of the year (1)', async () => {
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
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1, // initial offset
      );
    });

    it('generates starting first at month of the year (2)', async () => {
      mockActivity([
        '2017-12-31',
        '2017-12-30',
        '2017-12-29',
        '2017-12-28',
        '2017-12-27',
        '2017-12-26',
        '2017-12-25',
        '2017-01-20',
      ]);
      compareSignal(
        await generateAnalysisResults(),
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        1, // initial offset
      );
    });
  },
});
