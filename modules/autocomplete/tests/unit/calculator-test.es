/* global chai */
/* global describeModule */
/* global getLocaliseString */
const LANG_OPTIONS = {
  'de-DE': {
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
  'en-US': {
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
};

const CASES = [
  {
    query: '1000 + 1000',
    answers: {
      'de-DE': '2 000',
      'en-US': '2 000',
    },
  },
  {
    query: '1.1 + 1',
    answers: {
      'de-DE': '2,1',
      'en-US': '2.1',
    },
  },
  {
    query: '1,1 + 1',
    answers: {
      'de-DE': '2,1',
      'en-US': '2.1',
    },
  },
  {
    query: '1,1 + 1.1',
    answers: {
      'de-DE': '2,2',
      'en-US': '2.2',
    },
  },
  {
    query: '1111,0011 + 1,1',
    answers: {
      'de-DE': '1 112,1011',
      'en-US': '1 112.1011',
    },
  },
  {
    query: '1111.0001 + 1,000',
    answers: {
      'de-DE': '1 112,0001',
      'en-US': '2 111.0001',
    },
  },
  {
    query: '1 + 1.000.000',
    answers: {
      'de-DE': '1 000 001',
      'en-US': '1 000 001',
    },
  },
  {
    query: '1.111.111 + 1',
    answers: {
      'de-DE': '1 111 112',
      'en-US': '1 111 112',
    },
  },
  {
    query: '1000 + 1',
    answers: {
      'de-DE': '1 001',
      'en-US': '1 001',
    },
  },
  {
    query: '1,000 + 1',
    answers: {
      'de-DE': '2',
      'en-US': '1 001',
    },
  },
  {
    query: '1.000 + 1',
    answers: {
      'de-DE': '1 001',
      'en-US': '2',
    },
  },
  {
    query: '1,111.1 + 1',
    answers: {
      'de-DE': '', // Don't trigger for German
      'en-US': '1 112.1',
    },
  },
  {
    query: '1.111,1 + 1',
    answers: {
      'de-DE': '1 112,1',
      'en-US': '', // Don't trigger for English
    },
  },
  {
    query: '1,001 + 1.001',
    answers: {
      'de-DE': '1 002,001',
      'en-US': '1 002.001',
    },
  },
  {
    query: '1,111 + 1',
    answers: {
      'de-DE': '2,111',
      'en-US': '1 112',
    },
  },
  {
    query: '1.111 + 1',
    answers: {
      'de-DE': '1 112',
      'en-US': '2.111',
    },
  },
  {
    query: '1,111 + 1,1',
    answers: {
      'de-DE': '2,211',
      'en-US': '1 112.1',
    },
  },
  {
    query: '1.111 + 1.1',
    answers: {
      'de-DE': '1 112,1',
      'en-US': '2.211',
    },
  },
];

export default describeModule('autocomplete/calculator',
  function () {
    return {
      mathjs: {
        default: System._nodeRequire('mathjs'),
      },
      'core/utils': {
        default: {}
      },
      'core/console': {
        default: {
          error(e) { throw e; }
        }
      },
      'autocomplete/result': {
        default: {
          // useful for debugging
          cliqz: r => r,
        },
      },
    };
  },
  function () {
    describe('.calculate', function () {
      ['en-US', 'de-DE'].forEach(function (lang) {
        context(`with language set to ${lang}`, function () {
          let calculator;

          beforeEach(function () {
            calculator = this.module().default;

            this.deps('core/utils').default.getLocalizedString = (key) => {
              if (key === 'locale_lang_code') {
                return lang;
              }
              if (key === 'calculator-thousands-separator') {
                return LANG_OPTIONS[lang].thousandsSeparator;
              }
              if (key === 'calculator-decimal-separator') {
                return LANG_OPTIONS[lang].decimalSeparator;
              }
              return null;
            };
          });

          CASES.forEach(function (testCase) {
            const query = testCase.query;
            const answer = testCase.answers[lang];

            if (!answer) {
              return;
            }

            beforeEach(function () {
              calculator.init();
            });

            it(`for query: "${query}" should result with: "${answer}"`, function () {
              calculator.isCalculatorSearch(query);

              chai.expect(
                calculator.calculate(query)
              ).to.have.nested.property('snippet.extra.answer').that.equals(answer);
            });
          });
        });
      });
    });
  }
);
