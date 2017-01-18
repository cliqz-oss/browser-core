export default describeModule("notifications/notification-center",
  function() {
    return {
      "core/utils": {
        default: {
          getPref() {}
        }
      },
      "core/console": {
        default: {}
      },
      "core/anacron": {
        Cron: function() {}
      },
      "notifications/providers/gmail": {
        default: class {
          activate() {
          }
        }
      },
      "notifications/providers/pin-tab": {
        default: function() {}
      },
      "notifications/storage": {
        default: class {
          watchedDomainNames() { return []; }
          notifications() { return {} }
          saveDomain(domain) { return {}; }
          updateDomain(domain) { return {}; }
        }
      },
      "core/mixins/evented": {
        default: c => c,
      }
    }
  },
  function() {
    let nc;
    beforeEach(function() {
      const NotificationCenter = this.module().default;
      nc = new NotificationCenter();
    });
    describe('#start', function() {
      it('calls cron run on start', function () {
        const cron = nc.cron;
        const startSpy = sinon.spy(cron.start);
        const runSpy = sinon.spy(cron.run);

        cron.run = runSpy;
        cron.start = startSpy;

        nc.start();

        chai.expect(startSpy).to.have.been.called;
        chai.expect(runSpy).to.have.been.called;
      });
    });

    describe('#stop', function() {
      it('calls cron stop on stop', function() {
        const cron = nc.cron;
        const stopSpy = sinon.spy(cron.stop);

        cron.stop = stopSpy;
        nc.stop();

        chai.expect(stopSpy).to.have.been.called;
      });
    });

    describe('#domainList', function() {
      it('returns list of watched domains', function() {
        sinon.stub(nc.storage, 'watchedDomainNames')
           .returns(['mail.google.com']);

        chai.expect(nc.domainList()).to.deep.equal(['mail.google.com'])
      });
    });

    describe('#notifications', function() {
      context('available domains', function() {
        beforeEach(function() {
          nc.availableDomains = function() {
            return {
              'mail.google.com': {
                providerName: 'gmail',
                config: {},
                schedule: '*/1 *',
              },
              'twitter.com': {
                providerName: 'pin-tab',
                config: {
                  domain: 'twitter.com',
                  selector: '.with-count .count-inner',
                  attribute: 'innerText',
                },
                schedule: '*/1 *',
              },
            }
          }
        });
        context('no previously stored notifications', function() {
          beforeEach(function() {
            sinon.stub(nc.storage, 'notifications')
               .returns({});
          });

          it('should return no notifications if none of the speed dials is in the list of available domains', function() {
            const notifications = nc.notifications(['localhost', 'www.facebook.com']);
            chai.expect(notifications).to.deep.equal({});
          });

          it('should return notifications for the speed dials that match available domains', function() {
            const notifications = nc.notifications(['localhost', 'mail.google.com']);
            chai.expect(notifications).to.include.keys('mail.google.com');
            chai.expect(notifications).to.be.deep.equal({ 'mail.google.com': { status: 'available' } })
          });
        });

        context('previously stored notifications', function() {
          beforeEach(function() {
            nc.domainList = function() {
              return ['mail.google.com'];
            }
          });

          it('should return notifications for new speed dials that match available domains', function() {
            sinon.stub(nc.storage, 'notifications')
             .returns({
                'mail.google.com': {
                   count: 0, status: true, unread: 30
                }
            });
            const notifications = nc.notifications(['localhost', 'mail.google.com', 'twitter.com']);
            chai.expect(notifications).to.include.keys('mail.google.com');
            chai.expect(notifications).to.include.keys('twitter.com');
            chai.expect(notifications).to.deep.equal({
              'mail.google.com': {
                count: 0, status: true, unread: 30
              },
              'twitter.com': {
                status: 'available'
              }
            });
          });

          it('should not return notifications for previously stored speed dials that match available domains', function() {

            const notifications = nc.notifications(['localhost','twitter.com']);
            sinon.stub(nc.storage, 'notifications')
               .returns({});
            chai.expect(notifications).to.not.include.keys('mail.google.com');
            chai.expect(notifications).to.include.keys('twitter.com');
            chai.expect(notifications).to.deep.equal({
              'twitter.com': {
                status: 'available'
              }
            });
          });

          it('should not return notifications for previously stored speed dials that don\'t match available domains anymore', function() {
            nc.domainList = function() {
              return ['www.facebook.com'];
            }

            var spy = sinon.spy(nc.storage, 'notifications');
            nc.storage.notifications = spy

            const notifications = nc.notifications(['localhost','twitter.com', 'www.facebook.com']);
            chai.expect(spy).to.have.been.calledWith([]);
            chai.expect(notifications).to.not.include.keys('www.facebook.com');
            chai.expect(notifications).to.deep.equal({
              'twitter.com': {
                status: 'available'
              }
            });
          });
        });


      });
    });

    describe('#updateDomain', function() {
      context('#new domain', function() {
        describe('no new emails', function() {
          const domain = 'mail.google.com';
          const count = 0;
          const oldData = false;

          it('calls storage/saveDomain', function() {
            var spy = sinon.spy(nc.storage, 'saveDomain');
            nc.storage.saveDomain = spy;

            nc.updateDomain(domain, count, oldData);

            chai.expect(spy).to.have.been.called;
          });

          it('enables the domain and updates the count', function() {
            let spy = sinon.spy(nc.storage, 'saveDomain');
            nc.storage.saveDomain = spy;

            nc.updateDomain(domain, count, oldData);

            chai.expect(spy).to.have.been.calledWithExactly(domain,
            {
              count,
              status: 'enabled',
              error: null
            });
          });

        });

        describe('new emails', function() {
          const domain = 'mail.google.com';
          const count = 1;
          const oldData = false;

          it('updates status to unread and count to new count', function() {
            const saveSpy = sinon.spy(nc.storage, 'saveDomain');
            const updateSpy = sinon.spy(nc.storage, 'updateDomain');
            const unreadSpy = sinon.stub(nc, 'updateUnreadStatus')
              .returns(true);

            nc.storage.saveDomain = saveSpy;
            nc.storage.updateDomain = updateSpy;
            nc.publishEvent = function() {};
            nc.updateDomain(domain, count, oldData);

            chai.expect(updateSpy).to.have.been.called;
            chai.expect(updateSpy).to.have.been.calledWithExactly(domain,
            {
              count: count,
              status: 'enabled',
              error: null,
              unread: true
            });
          });
        });
      });

      context('#existing domain', function() {
        const domain = 'mail.google.com';

        it('does not call saveDomain', function() {
          const count = 3;
          const oldData = {
            count: 2,
            status: 'enabled',
            error: null
          }

          const saveSpy = sinon.spy(nc.storage, 'saveDomain');
          nc.storage.saveDomain = saveSpy;

          chai.expect(saveSpy);
        });

        it('updates unread status if new count is bigger than old count', function() {
          const count = 3;
          const oldData = {
            count: 2,
            status: 'enabled',
            error: null
          }

          const saveSpy = sinon.spy(nc.storage, 'saveDomain');
          const updateSpy = sinon.spy(nc.storage, 'updateDomain');
          const unreadSpy = sinon.stub(nc, 'updateUnreadStatus')
            .returns(true);

          nc.storage.saveDomain = saveSpy
          nc.storage.updateDomain = updateSpy;

          nc.updateDomain(domain, count, oldData);

          chai.expect(updateSpy).to.have.been.called;

          chai.expect(updateSpy).to.have.been.calledWithExactly(domain,
          {
            count,
            status: 'enabled',
            error: null,
            unread: true
          });
        });

        it('does not update unread status if new count is smaller than old count', function() {
          const count = 2;
          const oldData = {
            count: 3,
            status: 'enabled',
            error: null
          }

          const saveSpy = sinon.spy(nc.storage, 'saveDomain');
          const updateSpy = sinon.spy(nc.storage, 'updateDomain');
          const unreadSpy = sinon.stub(nc, 'updateUnreadStatus')
            .returns(true);

          nc.storage.saveDomain = saveSpy;
          nc.storage.updateDomain = updateSpy;

          nc.updateDomain(domain, count, oldData);

          chai.expect(updateSpy).to.have.been.calledWithMatch(domain, {
            unread: false
          });
        });

        it('updates count if new and old count are different', function() {
          const count = 3;
          const oldData = {
            count: 5,
            status: 'enabled',
            error: null
          }

          const saveSpy = sinon.spy(nc.storage, 'saveDomain');
          const updateSpy = sinon.spy(nc.storage, 'updateDomain');
          const unreadSpy = sinon.stub(nc, 'updateUnreadStatus')
            .returns(true);

          nc.storage.saveDomain = saveSpy
          nc.storage.updateDomain = updateSpy;

          nc.updateDomain(domain, count, oldData);

          chai.expect(updateSpy).to.have.been.calledWithMatch(domain,
          {
            count: count
          });
        });

        it('does not update count if new and old count are equal', function() {
          const count = 3;
          const oldData = {
            count: 3,
            status: 'enabled',
            error: null
          }

          const saveSpy = sinon.spy(nc.storage, 'saveDomain');
          const updateSpy = sinon.spy(nc.storage, 'updateDomain');
          const unreadSpy = sinon.stub(nc, 'updateUnreadStatus')
            .returns(true);

          nc.storage.saveDomain = saveSpy;
          nc.storage.updateDomain = updateSpy;

          nc.updateDomain(domain, count, oldData);

          chai.expect(updateSpy).to.have.not.been.called;
        });

        context('user was previously logged out', function() {
          it('does update the count if user was previously logged out and now is logged in', function() {
            const count = 2;
            const oldData = {
              count: null,
              status: 'inaccessible',
              error: 'cannot-fetch-count',
              unread: null
            };

            const updateSpy = sinon.spy(nc.storage, 'updateDomain');
            const unreadSpy = sinon.stub(nc, 'updateUnreadStatus')
              .returns(false);
            nc.storage.updateDomain = updateSpy;
            nc.publishEvent = function() {}
            nc.updateDomain(domain, count, oldData);

            chai.expect(updateSpy).to.have.been.calledWithExactly(domain, {
              count,
              status: 'enabled',
              error: null,
              unread: true
            });
          });

        });
      });

    });
  }
);
