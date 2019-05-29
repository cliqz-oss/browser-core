import {
  expect,
  sleep,
  win,
} from '../../../tests/core/integration/helpers';
import { isBootstrap } from '../../../core/platform';

export default function () {
  if (!isBootstrap) {
    return;
  }

  describe('content-script', () => {
    let mdSubscription = null;

    afterEach(() => {
      mdSubscription.unsubscribe();
    });

    function onMousedown(callback) {
      mdSubscription = win.CliqzEvents.subscribe('core:mouse-down', () => {
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
      onMousedown(() => { messageCount += 1; });

      sleep(500).then(() => {
        try {
          expect(messageCount).to.equal(1);
          done();
        } catch (e) {
          done(e);
        }
      });

      triggerMousedown();
    });
  });
}
