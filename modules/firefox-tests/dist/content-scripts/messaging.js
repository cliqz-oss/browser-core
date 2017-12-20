/* global TESTS, describe, getWindow, chai, document, MouseEvent */

TESTS.ContentScriptsMessagingTests = function ContentScriptsMessagingTests() {
  let w;

  describe('content-script', () => {
    let mdSubscription = null;

    beforeEach(() => {
      w = getWindow();
    });

    afterEach(() => {
      mdSubscription.unsubscribe();
    });

    function restartMessageManager() {
      const messageManager = w.CLIQZ.app.modules.core.background.mm;
      messageManager.unload();
      return messageManager.init();
    }

    function onMousedown(callback) {
      mdSubscription = w.CliqzEvents.subscribe('core:mouse-down', (...args) => {
        callback();
      });
    }

    function triggerMousedown() {
      document.body.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true
      }));
    }

    it('message can be received', (done) => {
      onMousedown(() => {
        done();
      });
      triggerMousedown();
    });

    it('single message should not arrive more than once after extension restart', (done) => {
      let messageCount = 0;
      onMousedown(() => messageCount += 1);

      sleep(500).then(() => {
        try {
          chai.expect(messageCount).to.equal(1);
          done();
        } catch (e) {
          done(e);
        }
      });

      triggerMousedown();
    });
  });
};
