export default describeModule('mobile-history/history',
  function () {
    return {
      'mobile-touch/longpress': {
        default: { onTap() { }, onLongPress() { } }
      },
      'core/templates': { },
    };
  },
  function () {
    console.log("hi")
    describe('Mix History with Query', function () {
      it('Should mix the 2 arrays', function () {
        chai.expect(true).to.be.ok;
      });
    });
  }
);
