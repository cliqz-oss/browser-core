'use strict';

var expect = chai.expect,
  dummyEventHandler = function (dummyArg) {
    handlerCalled = dummyArg;
  },
  handlerCalled = 0,
  dummyArg = 10,
  eventID = "unitTestEvent";

DEPS.CliqzEventsTest = ["core/events"];
TESTS.CliqzEventsTest = function (CliqzEvents) {
  describe("CliqzEvents Unit Test", function () {
    beforeEach(function () {
      handlerCalled = 0;
      CliqzEvents.sub(eventID, dummyEventHandler)
    });

    describe("Test event subscribe", function () {
      it("Handler is in event list", function () {
        expect(CliqzEvents.cache[eventID].length).to.be.above(0);
      });
    });

    describe("Test publish event", function () {
      it("Handler is called", function () {
        CliqzEvents.pub(eventID, dummyArg);
        return waitFor(function () {
          return handlerCalled === dummyArg;
        });
      });
    });

    describe("Two functions subscribed", function() {
      var fn1Called = 0;
      var fn1 = function() {
        fn1Called++;
      };
      var fn2Called = 0;
      var fn2 = function() {
        fn2Called++;
      };
      beforeEach(function() {
        fn1Called = 0;
        fn2Called = 0;
        CliqzEvents.sub(eventID, fn1);
        CliqzEvents.sub(eventID, fn2);
      });

      afterEach(function() {
        CliqzEvents.clean_channel(eventID);
      });

      it("calls all functions", function() {
        CliqzEvents.pub(eventID);
        return waitFor(function() {
          return fn1Called === 1 && fn2Called === 1;
        });
      });

      describe("Test function un_sub", function() {

        beforeEach(function() {
          CliqzEvents.un_sub(eventID, fn2);
        });

        it("Only calls one function", function() {
          CliqzEvents.pub(eventID);
          return waitFor(function() {
            return fn1Called === 1;
          }).then(function() {
            chai.expect(fn2Called).to.equal(0);
          });
        });
      });
    });
  });
};
