/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names */

export default describeModule('market-analysis/model/time_frames',
  () => ({
    'core/prefs': {
      default: {
        get: () => '20170602'
      }
    }
  }),
  () => {
    describe('TimeFrames class', () => {
      let TimeFrames;
      let tf;

      beforeEach(function () {
        TimeFrames = this.module().default;
        tf = new TimeFrames(new Date(2017, 4, 18, 1, 1, 1, 1));
      });

      it('check fromToday function', () => {
        chai.expect(TimeFrames.fromToday().month).eql(6);
        chai.expect(TimeFrames.fromToday().weekOfYear).eql(22);
        chai.expect(TimeFrames.fromToday().dayOfYear).eql(153);
      });

      it('check constructor', () => {
        chai.expect(tf.month).eql(5);
        chai.expect(tf.dayOfYear).eql(138);
        chai.expect(tf.weekOfYear).eql(20);
      });
    });
  },
);
