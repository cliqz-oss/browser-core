export default describeModule("notifications/window",
  function() {
    return {
      'core/kord/inject': {
        default: {
          module() { return { action() {} }; }
        }
      },
      'freshtab/main': {
        default: {
          isActive() {}
        }
      }
    };
  },
  function() {
    let subject;

    beforeEach(function() {
      const Notifications = this.module().default;
      subject = new Notifications();
    });

    describe('#init', function() {

      context('with Freshtab active', function () {
        beforeEach(function () {
          const freshtab = this.deps('freshtab/main').default;
          sinon.stub(freshtab, 'isActive', () => true)
        });

        it('calls action: notifications/updateUnreadStatus', function() {
          const actionStub = sinon.stub(subject.notifications, 'action',
            () => Promise.resolve(true));

          return subject.init().then(() => {
            chai.expect(actionStub).to.have.been.calledWith('hasUnread');
            chai.expect(actionStub).to.have.been.calledWith('updateUnreadStatus');
          });
        });
      });

    });
  }
);
