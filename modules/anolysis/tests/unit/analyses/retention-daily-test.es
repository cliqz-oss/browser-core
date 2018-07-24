require('./retention-helpers')({
  name: 'retention-daily',
  tests: ({
    mockActivity,
    compareSignal,
    generateAnalysisResults,
    CURRENT_DATE,
  }) => {
    it('generates inactive signals', async () => {
      mockActivity([]);
      compareSignal(
        await generateAnalysisResults(),
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        0, // initial offset
      );
    });

    it('generates 1 day activity', async () => {
      mockActivity([CURRENT_DATE]);
      compareSignal(
        await generateAnalysisResults(),
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        0, // initial offset
      );
    });

    it('generates 2 days activity', async () => {
      mockActivity([CURRENT_DATE, '2017-12-31']);
      compareSignal(
        await generateAnalysisResults(),
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        0, // initial offset
      );
    });

    it('generates 3 days activity', async () => {
      mockActivity([
        CURRENT_DATE,
        '2017-12-31',
        '2017-12-26',
      ]);
      compareSignal(
        await generateAnalysisResults(),
        [1, 1, 0, 0, 0, 0, 1, 0, 0, 0],
        0, // initial offset
      );
    });

    it('generates 10 days activity', async () => {
      mockActivity([
        CURRENT_DATE,
        '2017-12-31',
        '2017-12-30',
        '2017-12-29',
        '2017-12-28',
        '2017-12-27',
        '2017-12-26',
        '2017-12-25',
        '2017-12-24',
        '2017-12-23',
      ]);
      compareSignal(
        await generateAnalysisResults(),
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        0, // initial offset
      );
    });
  },
});
