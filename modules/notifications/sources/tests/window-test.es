export default describeModule("notifications/window",
  function() {
    return {
      'core/utils': {
        default: {
          callAction() {}
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

      it('calls action: notifications/updateUnreadStatus', function() {
        const utils = this.deps('core/utils').default
        const freshtab = this.deps('freshtab/main').default;
        sinon.stub(freshtab, 'isActive').resolves(true);
        const stub = sinon.stub(utils, 'callAction').resolves(true);
        subject.init();
        stub().then(function(value) {
         chai.expect(spy).to.have.been.calledWith('notifications', 'updateUnreadStatus')
        })

      });

    });
  }
);
