/* global chai */
/* global sinon */
/* global describeModule */

let telemetrySpy = null;
let privateMode = false;

export default describeModule('browser-panel/window',
  () => ({
    'core/services/telemetry': {
      default: {
        push: (...args) => telemetrySpy(...args),
      },
    },
    'core/browser': {
      isPrivateMode() { return privateMode; },
      openLink() {},
    },
    'core/config': {
      default: {
        baseURL: 'chrome://cliqz/content/'
      }
    },
    'core/console': {
      default: {
        log() {}
      }
    },
    'core/services/logos': {
      default: {
        getLogoDetails() {},
      },
    },
    'browser-panel/background': {
      default: {
        actions: {
          windowUIConnector() {}
        }
      }
    },
    'core/events': {},
    'core/prefs': {},
    'core/helpers/stylesheet': {
      addStylesheet() {},
      removeStylesheet() {}
    }
  }),
  () => {
    let subject;
    let bg;

    beforeEach(function () {
      privateMode = false;
      bg = this.deps('browser-panel/background').default;
      bg.is_enabled = true;

      const Subject = this.module().default;
      subject = new Subject({ background: bg });
      subject.window = {
        document: {},
        gBrowser: {}
      };
    });

    describe('init()', function () {
      beforeEach(() => {
        privateMode = true;
      });

      it('in private mode', function () {
        return chai.expect(subject.init()).to.eventually.equal('Private mode active');
      });
    });

    context('telemetry', function () {
      beforeEach(function () {
        telemetrySpy = sinon.spy(() => {});

        // subject.iframe is created in the init(), but we don't call it
        subject.iframe = {
          contentWindow: {
            postMessage() {}
          },
          contentDocument: {
            getElementById() {}
          },
          style: {}
        };
        subject.sendOffersTemplateDataToIframe = () => {};
      });

      describe('showing the promo bar', function () {
        const showData = {
          offer_id: 'id',
          offer_data: {
            ui_info: {
              template_name: 'name',
              template_data: {}
            }
          }
        };
        it('sends an "offerz > bar > show" signal', function () {
          subject.actions.showElement({ type: 'offerElement', data: showData });
          chai.expect(telemetrySpy).to.have.been.calledOnce;
          chai.expect(telemetrySpy).to.have.been.calledWith({
            type: 'offrz',
            view: 'bar',
            action: 'show'
          });
        });
      });

      describe('calling a click handler on description', function () {
        const urlData = {
          data: {
            el_id: 'offer_description'
          }
        };
        it('sends an "offrz > bar > click > use" signal', function () {
          subject.iframeHandlers.openUrlHandler(urlData);
          chai.expect(telemetrySpy).to.have.callCount(1);
          chai.expect(telemetrySpy).to.have.been.calledWith({
            type: 'offrz',
            view: 'bar',
            action: 'click',
            target: 'use'
          });
        });
      });

      describe('calling a click handler on a close button', function () {
        const closeData = {
          action: 'button_pressed',
          data: {
            element_id: 'offer_closed',
          }
        };

        it('sends an "offrz > bar > click > remove" signal', function () {
          subject.offersActions.button_pressed({
            type: 'offerElement', data: closeData
          });
          subject.iframeHandlers.offersIFrameHandler(closeData);
          chai.expect(telemetrySpy).to.have.callCount(1);
          chai.expect(telemetrySpy).to.have.been.calledWith({
            type: 'offrz',
            view: 'bar',
            action: 'click',
            target: 'remove'
          });
        });
      });

      describe('calling a click handler on a copy button', function () {
        const copyData = {
          action: 'button_pressed',
          data: {
            element_id: 'code_copied'
          }
        };

        it('sends an "offrz > bar > click > copy_code" signal', function () {
          subject.offersActions.button_pressed({
            type: 'offerElement', data: copyData
          });
          subject.iframeHandlers.offersIFrameHandler(copyData);
          chai.expect(telemetrySpy).to.have.callCount(1);
          chai.expect(telemetrySpy).to.have.been.calledWith({
            type: 'offrz',
            view: 'bar',
            action: 'click',
            target: 'copy_code'
          });
        });
      });
    });
  });
