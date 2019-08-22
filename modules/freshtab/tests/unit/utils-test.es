/* global chai, describeModule */

export default describeModule('freshtab/utils',
  function () {
    return {
      'core/i18n': {
        getMessage: function (str) {
          switch (str) {
            case 'time_saved_hours':
              return 'Std';
            case 'time_saved_minutes':
              return 'Min';
            default: return 'S';
          }
        },
      },
    };
  },
  function () {
    let formatTime;

    beforeEach(function () {
      formatTime = this.module().default;
    });

    describe('#formatTime, locale "de"', function () {
      [
        ['undefined -> 0 S', undefined, '0 S'],
        ['0 ms -> 0 S', 0, '0 S'],
        ['500 ms -> 0 S', 500, '0 S'],
        ['1000 ms -> 1 S', 1000, '1 S'],
        ['60000 ms -> 1 Min', 60000, '1 Min'],
        ['65000 ms -> 1 Min', 65000, '1 Min'],
        ['3600000 ms -> 1 Std', 3600000, '1 Std'],
        ['3660000 ms -> 1 Std 1 Min', 3660000, '1 Std 1 Min'],
        ['7200000 ms -> 2 Std', 7200000, '2 Std']
      ].forEach(([explain, param, expected]) => {
        it(explain, () => {
          chai.expect(formatTime(param)).equal(expected);
        });
      });
    });
  });
