/* global chai, describeModule, sinon */
/* eslint new-cap: off */

const tldts = require('tldts');

export default describeModule('dropdown/dropdown',
  function () {
    return {
      './templates': {},
      './telemetry': {},
      '../core/url': {},
      '../core/events': {},
      './context-menu': {},
      '../platform/browser': {},
      '../platform/lib/punycode': {},
      'platform/lib/tldts': tldts,
    };
  },
  function () {
    let dropDown;

    beforeEach(function () {
      dropDown = new (this.module()).default({
        querySelectorAll() { return []; },
      }, null, {});
      dropDown.lastMouseMove = Date.now() - 100;
    });

    describe('#onMouseMove', function () {
      context('with .result element having non-selectable class', function () {
        let evt;

        beforeEach(function () {
          evt = {
            originalTarget: {
              nodeType: 1,
              closest() {
                return {
                  classList: {
                    contains() {
                      return true;
                    }
                  }
                };
              },
            },
          };
        });

        it('Should not call #reportHover', function () {
          dropDown.actions.reportHover = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.actions.reportHover).to.have.not.been.called;
        });
      });

      context('with .result element does not have non-selectable class', function () {
        let evt;

        beforeEach(function () {
          evt = {
            originalTarget: {
              nodeType: 1,
              closest() {
                return {
                  classList: {
                    contains() {
                      return false;
                    }
                  },
                  dataset: {
                    url: '',
                  }
                };
              },
            },
          };

          dropDown.results = {
            get() {
              return {
                serialize() {}
              };
            },
            selectableResults: {
              findIndex() {
                return 1;
              }
            }
          };
        });

        it('calls #reportHover', function () {
          dropDown.actions.reportHover = sinon.spy();
          dropDown.updateSelection = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.actions.reportHover).to.have.been.called;
        });
      });
    });
  });
