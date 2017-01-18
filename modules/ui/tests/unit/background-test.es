export default describeModule("ui/background",
  function() {
    return {
      "core/base/background": {
        default: b => b
      },
      "core/events": {},
      "core/cliqz": {
        utils: {},
        events: {}
      },
      "ui/views/partials/location/missing_location_1": {},
      "core/utils": {
        default: {
          getDetailsFromUrl() {},
          getLogoDetails() {}
        }
      }
    }
  },
  function() {
    describe("actions", function() {

      describe("#checkShareLocationTrigger", function() {
        let subject;
        let spy;
        let isABTest = false;
        let dismissedAlerts = {};

        beforeEach(function() {
          //bind action to module
          this.module().default.actions.checkShareLocationTrigger = this.module().default.actions.checkShareLocationTrigger
            .bind(this.module().default);

          subject = this.module().default.actions.checkShareLocationTrigger;

          const events = this.deps('core/cliqz').events;
          spy = sinon.spy(events.pub);
          events.pub = spy;

          this.deps("core/cliqz").utils.getPref = function (prefName) {
            if (prefName === "extOnboardShareLocation") {
              return isABTest;
            }
            if (prefName === "dismissedAlerts") {
              return JSON.stringify(dismissedAlerts);
            }
          }
        });


        context("not in AB test", function() {
          it("does not publish ui:missing_location_shown event", function () {
            subject();
            chai.expect(spy).to.not.have.been.called;
          });
        });

        context("in AB Test", function() {
          isABTest = true;

          context("user never clicked location alert's close button on Freshtab", function() {
            it('should trigger if user selects in the dropdown a local result with an alert', function() {
              const result = {
                isLocal: true,
                hasAskedForLocation: true
              }

              subject(result);
              chai.expect(spy).to.have.been.called;
              chai.expect(spy).to.have.been.calledWith('ui:missing_location_shown');
            });

            it('should not trigger if user selects in the dropdown a local result with no alert', function() {
              const result = {
                isLocal: true,
                hasAskedForLocation: false
              }

              subject(result);
              chai.expect(spy).to.not.have.been.called;
            });

            it('should not trigger if user selects in the dropdown a non local result', function() {
              const result = {
                isLocal: false,
                hasAskedForLocation: false
              }

              subject(result);
              chai.expect(spy).to.not.have.been.called;
            });
          });

          context("user clicked location alert's close button on Freshtab", function() {
            let result = {
              isLocal: true,
              hasAskedForLocation: true
            }
            it('should trigger if user dismissed only once', function() {
              dismissedAlerts = {
                'share-location': {
                  scope: 'freshtab',
                  count: 1
                }
              }
              subject(result);
              chai.expect(spy).to.have.been.called;
              chai.expect(spy).to.have.been.calledWith('ui:missing_location_shown');
            });

            it('should not trigger if user dismissed twice', function() {
              dismissedAlerts = {
                'share-location': {
                  scope: 'freshtab',
                  count: 2
                }
              };

              subject(result);
              chai.expect(spy).to.not.have.been.called;
            });
          });
        });

      });
    })
  }
);
