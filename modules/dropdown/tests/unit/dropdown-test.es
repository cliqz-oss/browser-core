/* global chai, sinon */

export default describeModule('dropdown/dropdown',
  function () {
    return {
      './templates': {},
      './telemetry': {},
      '../core/url': {},
      './context-menu': {},
    };
  },
  function () {
    let dropDown;

    beforeEach(function () {
      dropDown = new (this.module()).default();
      dropDown.lastMouseMove = Date.now() - 100;
    });

    describe('#onMouseMove', function () {
      context('without .result element found', function () {
        let evt;

        beforeEach(function () {
          evt = {
            originalTarget: {
              nodeType: 1,
              closest() {
                // no return as there is no .result
              },
            },
          };
        });

        it('calls #clearSelection', function () {
          dropDown.clearSelection = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.clearSelection).to.have.been.called;
        });
      });

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

        it('Should not call #clearSelection', function () {
          dropDown.clearSelection = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.clearSelection).to.have.not.been.called;
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
                  }
                };
              },
            },
          };

          dropDown.results = {
            selectableResults: {
              findIndex() {
                return 1;
              }
            }
          };
        });

        it('calls #clearSelection', function () {
          dropDown.clearSelection = sinon.spy();
          dropDown.updateSelection = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.clearSelection).to.have.been.called;
        });

        it('calls #updateSelection', function () {
          dropDown.clearSelection = sinon.spy();
          dropDown.updateSelection = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.updateSelection).to.have.been.called;
        });
      });
    });
  }
);
