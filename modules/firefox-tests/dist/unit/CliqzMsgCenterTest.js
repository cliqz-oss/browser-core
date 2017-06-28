/* global waitFor, setTimeout, Promise */
'use strict';

DEPS.CliqzmessageCenterTestUnit = ["message-center/message-center", "core/utils"];
TESTS.CliqzmessageCenterTestUnit = function (CliqzMsgCenter, CliqzUtils) {
  describe('CliqzMsgCenter (unit)', function() {
    this.timeout(4000);

    var messageCenter, dropdownHandler,
    freshtabHandler,
    getMessage = function (id, location) {
      return {
        id: id,
        location: location,
        options: [
        {
          action: 'confirm',
          label: 'Jetzt installieren!',
          style: 'default',
          url: 'www.dominikschmidt.net'
        },
        {
          action: 'postpone',
          label: 'Später',
          style: 'default'
        },
        {
          action: 'discard',
          label: 'Nicht mehr anzeigen',
          style: 'gray'
        }
        ],
        text: 'Der CLIQZ browser ist besser als Firefox.'
      };
    }, ui = function () { return CliqzUtils.getWindow().CLIQZ.UI; },
    core = function () {
      return CliqzUtils.getWindow().CLIQZ.Core;
    };

    beforeEach(function() {
      messageCenter = new CliqzMsgCenter();
      dropdownHandler = messageCenter._messageHandlers.MESSAGE_HANDLER_DROPDOWN;
      freshtabHandler = messageCenter._messageHandlers.MESSAGE_HANDLER_FRESHTAB;
    });

    afterEach(function (done) {
      setTimeout(done, 100);
    });

    context('debug', function() {
      it('CLIQZ.UI should exist', function() {
        chai.expect(CliqzUtils.getWindow().CLIQZ.UI).to.not.be.undefined;
      });
    });

    context('general tests', function () {
      it('should register all handlers', function() {
        chai.expect(messageCenter._messageHandlers).to.have.all.keys(
          'MESSAGE_HANDLER_ALERT', 'MESSAGE_HANDLER_DROPDOWN', 'MESSAGE_HANDLER_FRESHTAB'
          );
      });

      it('should enqueue messages on show', function() {
        var alertHandler = messageCenter._messageHandlers.MESSAGE_HANDLER_ALERT;

        chai.expect(dropdownHandler._messageQueue).to.have.length(0);
        chai.expect(alertHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(getMessage('ID0', 'bottom'), 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(1);
        chai.expect(alertHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(getMessage('ID1', 'bottom'), 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(2);
        chai.expect(alertHandler._messageQueue).to.have.length(0);
      });

      it('should dequeue messages on hide', function() {
        var msg0 = getMessage('ID0'), msg1 = getMessage('ID1', 'bottom');
        chai.expect(dropdownHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
        messageCenter.showMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(2);

        messageCenter.hideMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(1);
        chai.expect(dropdownHandler._messageQueue).to.contain(msg0);

        messageCenter.hideMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(0);
      });
    });
});
};
