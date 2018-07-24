/* global chai */

require('./retention-helpers')({
  name: 'daily-active',
  tests: ({ generateAnalysisResults }) => {
    it('Generate daily active signal', async () => {
      chai.expect(await generateAnalysisResults()).to.be.eql([{}]);
    });
  },
});


require('./retention-helpers')({
  name: 'weekly-active',
  tests: ({
    mockActivity,
    generateAnalysisResults,
  }) => {
    it('Generates weekly active signal', async () => {
      mockActivity([]);
      chai.expect(await generateAnalysisResults()).to.be.eql([{}]);
    });

    for (let i = 2; i <= 7; i += 1) {
      it(`Does not generate if already active during the week: 2018-01-0${i}`, async () => {
        mockActivity([`2018-01-0${i}`]);
        chai.expect(await generateAnalysisResults()).to.be.eql([]);
      });
    }

    it('Generates weekly active signal (if active previous week)', async () => {
      mockActivity(['2017-12-31']);
      chai.expect(await generateAnalysisResults()).to.be.eql([{}]);
    });

    it('Generates weekly active signal (if active next week)', async () => {
      mockActivity(['2018-01-08']);
      chai.expect(await generateAnalysisResults()).to.be.eql([{}]);
    });
  },
});


require('./retention-helpers')({
  name: 'monthly-active',
  tests: ({
    mockActivity,
    generateAnalysisResults,
  }) => {
    it('Generates monthly active signal', async () => {
      mockActivity([]);
      chai.expect(await generateAnalysisResults()).to.be.eql([{}]);
    });

    for (let i = 2; i <= 31; i += 1) {
      it(`Does not generate if already active during the month: 2018-01-${i}`, async () => {
        mockActivity([`2018-01-${i}`]);
        chai.expect(await generateAnalysisResults()).to.be.eql([]);
      });
    }

    it('Generates monthly active signal (if active previous month)', async () => {
      mockActivity(['2017-12-31']);
      chai.expect(await generateAnalysisResults()).to.be.eql([{}]);
    });

    it('Generates weekly active signal (if active next month)', async () => {
      mockActivity(['2018-02-01']);
      chai.expect(await generateAnalysisResults()).to.be.eql([{}]);
    });
  },
});
