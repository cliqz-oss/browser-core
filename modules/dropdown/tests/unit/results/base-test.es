export default describeModule('dropdown/results/base',
  function () {
    return {
      '../../core/events': {},
      '../../core/utils': {},
      '../../core/url': {},
      '../../core/console': {},
    };
  },
  function () {
    let BaseResult;

    beforeEach(function () {
      BaseResult = this.module().default;
    });

    context('with deep results', function () {
      [
        {
          methodName: 'internalResults',
          deepResultsType: 'buttons',
        },
        {
          methodName: 'imageResults',
          deepResultsType: 'images',
        },
        {
          methodName: 'anchorResults',
          deepResultsType: 'simple_links',
        },
        {
          methodName: 'newsResults',
          deepResultsType: 'news',
        },
      ].forEach(testCase => {
        context('#'+testCase.methodName, function () {
          let result;
          let subResults;

          beforeEach(function () {
            result = new BaseResult({
              text: 'hello world',
              data: {
                deepResults: [
                  {
                    links: [
                      {}
                    ],
                    type: testCase.deepResultsType,
                  }
                ]
              }
            });
            subResults = result[testCase.methodName];
          });

          // Sanity check
          it('result has a query', function () {
            chai.expect(result)
              .to.have.property('query').that.equals(result.rawResult.text);
          });

          it('maps the result', function () {
            chai.expect(subResults)
              .to.have.property('length').that.equals(1);
          });

          it('gets query from parent', function () {
            chai.expect(subResults[0])
              .to.have.property('query').that.equals(result.query);
          });
        });
      });
    });
  }
);
