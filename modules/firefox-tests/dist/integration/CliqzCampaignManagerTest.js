'use strict';


DEPS.CliqzCampaignManagerTestItegration = ["core/utils", "message-center/message-center", "campaign-manager/campaign-manager"];
TESTS.CliqzCampaignManagerTestItegration = function (CliqzUtils, CliqzMsgCenter, CliqzCampaignManager) {
	describe('integration CliqzCampaignManager' , function() {
    this.retries(1);

    var response, messageCenter, campaignManager,
    core = function () { return CliqzUtils.getWindow().CLIQZ.Core },
    ui = function() { return CliqzUtils.getWindow().CLIQZ.UI },
    gBrowser = CliqzUtils.getWindow().gBrowser;

    beforeEach(function() {
      response = {
        campaigns: {
          TEST001: {
            DEBUG_remaining_clicks: 10,
            DEBUG_remaining_shows: 48,
            handlerId: 'MESSAGE_HANDLER_DROPDOWN',
            limits: {
              confirm: -1,
              discard: -1,
              ignore: -1,
              postpone: -1,
              show: -1,
              trigger: 1
            },
            message: {
              location: 'bottom',
              backgroundColor: 'FC554F',
              options: [
              {
                action: 'confirm',
                label: 'Jetzt installieren!',
                style: 'default'
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
              text: 'Der CLIQZ-Browser ist besser als Firefox.',
              textColor: 'FFFFFF'
            },
            triggerId: 'TRIGGER_URLBAR_FOCUS'
          }
        }
      };
      messageCenter = CliqzMsgCenter.getInstance();
      campaignManager = CliqzCampaignManager.getInstance();
      campaignManager.updateCampaigns = function () { };
      campaignManager.deactivateCampaignUpdates();
      for (var c in campaignManager._campaigns) {
        campaignManager.removeCampaign(c);
      }
      campaignManager.addCampaign('TEST001', response.campaigns.TEST001);
      chai.expect(Object.keys(campaignManager._campaigns).length).to.equal(1);
    });
    /*
    it('should show message', function() {
      this.timeout(5000);
      campaignManager._campaigns.TEST001.limits.trigger = 2;

      core().urlbar.blur();
      core().urlbar.focus();
      return waitFor(function() {
        return campaignManager._campaigns.TEST001.counts.trigger === 1;
      }).then(function () {
        core().urlbar.blur();
        core().urlbar.focus();
        return waitFor(function () {
          return Boolean(ui().messageCenterMessage) &&
                 campaignManager._campaigns.TEST001.state === 'show';
        });
      }).then(function () {
        fillIn('some query');

        return waitForResult().then(function() {
          return Boolean(ui().messageCenterMessage) &&
                 core().popup.cliqzBox.messageContainer.innerHTML.indexOf(
                   response.campaigns.TEST001.message.text) >= 0;
        });
      });
    });

    it('should hide message', function() {
      campaignManager._campaigns.TEST001.limits.trigger = 1;

      core().urlbar.blur();
      core().urlbar.focus();
      return waitFor(function () {
        return Boolean(ui().messageCenterMessage) &&
               campaignManager._campaigns.TEST001.state === 'show';
      }).then(function () {
        campaignManager._onMessageAction('TEST001', 'postpone');
        return waitFor(function () {
          return !Boolean(ui().messageCenterMessage);
        });
      }).then(function () {
        fillIn('some query');
        return waitForResult().then(function() {
          return core().popup.cliqzBox.messageContainer.innerHTML.indexOf(
              response.campaigns.TEST001.message.text) === -1;
        });
      });
    });
    */
    /*
    context('URL tests', function () {
      var url = 'about:config';

      afterEach(function () {
        if (gBrowser.tabs.length > 1) {
          gBrowser.removeTab(gBrowser.selectedTab);
        }
      });

      it('should open URL on confirm without limit', function() {
        campaignManager._campaigns.TEST001.limits.trigger = 1;
        campaignManager._campaigns.TEST001.limits.confirm = -1;
        campaignManager._campaigns.TEST001.message.options[0].url = url;


        core().urlbar.blur();
        core().urlbar.focus();
        fillIn('some query');
        return waitForResult().then(function() {
          click($cliqzMessageContainer().find(".cqz-msg-btn-action-confirm")[0]);
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              // checks (1) for expected URL and (2) that new tab is focused
              //remove trailing slash
              try {
                chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
                var str = CliqzUtils.stripTrailingSlash(core().urlbar.value);
                chai.expect(str).to.equal(url);
                resolve();
              } catch(e) {
                reject(e);
              }
            }, 1000);
          });
        });
      });
    });
    */
/*

  it('should open URL on actions other than confirm', function(done) {
    this.timeout(4000);
    campaignManager._campaigns.TEST001.limits.trigger = 1;
    campaignManager._campaigns.TEST001.limits.postpone = 1;
    campaignManager._campaigns.TEST001.message.options[1].url = url;


    core().urlbar.blur();
    core().urlbar.focus();
    fillIn('some query');
    waitForResult().then(function() {
      click($cliqzMessageContainer().find(".cqz-msg-btn-action-postpone")[0]);
      setTimeout(function () {
        chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
                        // checks (1) for expected URL and (2) that new tab is focused
                        //remove trailing slash
                        var str = CliqzUtils.stripTrailingSlash(core().urlbar.value);
                        chai.expect(str).to.equal(url);
                        done();
                      }, 1000)
    });
  });
});
*/
  });
};
