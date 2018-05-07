/* global chai, TESTS */

/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

TESTS.MessageCenterTest = function (CliqzUtils) {
  const CLIQZ = CliqzUtils.getWindow().CLIQZ;
  if (!CLIQZ.app.modules['message-center']) {
    return;
  }
  describe('Message Center tests', function () {
    this.timeout(4000);

    let messageCenter;
    let dropdownHandler;

    const getMessage = function (id, location) {
      return {
        id,
        location,
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
    };

    beforeEach(function () {
      const CliqzMsgCenter = CLIQZ.app.modules['message-center'].background.messageCenter.constructor;
      messageCenter = new CliqzMsgCenter();
      dropdownHandler = messageCenter._messageHandlers.MESSAGE_HANDLER_DROPDOWN;
    });

    afterEach(function (done) {
      setTimeout(done, 100);
    });

    context('general tests', function () {
      it('should register all handlers', function () {
        chai.expect(messageCenter._messageHandlers).to.have.all.keys(
          'MESSAGE_HANDLER_ALERT', 'MESSAGE_HANDLER_DROPDOWN', 'MESSAGE_HANDLER_FRESHTAB_TOP', 'MESSAGE_HANDLER_FRESHTAB_MIDDLE'
        );
      });

      it('should enqueue messages on show', function () {
        const alertHandler = messageCenter._messageHandlers.MESSAGE_HANDLER_ALERT;

        chai.expect(dropdownHandler._messageQueue).to.have.length(0);
        chai.expect(alertHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(getMessage('ID0', 'bottom'), 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(1);
        chai.expect(alertHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(getMessage('ID1', 'bottom'), 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(2);
        chai.expect(alertHandler._messageQueue).to.have.length(0);
      });

      it('should dequeue messages on hide', function () {
        const msg0 = getMessage('ID0');
        const msg1 = getMessage('ID1', 'bottom');
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
