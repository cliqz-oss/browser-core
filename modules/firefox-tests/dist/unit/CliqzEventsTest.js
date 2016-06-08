'use strict';

var expect = chai.expect,
  dummyEventHandler = function (dummyArg) {
    handlerCalled = dummyArg;
  },
  handlerCalled = 0,
  dummyArg = 10,
  eventID = "unitTestEvent";

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
  });
};

