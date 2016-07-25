'use strict';

var campaigns = {
    campaigns: {
        TEST001: {
            DEBUG_remaining_clicks: 10,
            DEBUG_remaining_shows: 48,
            handlerId: 'MESSAGE_HANDLER_DROPDOWN_FOOTER',
            limits: {
                confirm: -1,
                discard: -1,
                ignore: -1,
                postpone: -1,
                show: -1,
                trigger: 1
            },
            message: {
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
                text: 'Der CLIQZ browser ist besser als Firefox.',
                textColor: 'FFFFFF'
            },
            triggerId: 'TRIGGER_URLBAR_FOCUS'
        }
    }
};

var wasShown = false;

TESTS.CliqzMsgCenterTestUnit = function (CliqzMsgCenter) {
    describe('CliqzMsgCenter (unit)', function() {
        beforeEach(function() {
            CliqzMsgCenter._updateCampaigns = function () { };
            CliqzMsgCenter._deactivateCampaignUpdates();
            for (var c in CliqzMsgCenter._campaigns) {
                CliqzMsgCenter._removeCampaign(c);
            }
            chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(0);
       });

        describe('addCampaign', function() {
            it('should add campgain', function() {
                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);

                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('idle');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.handlerId).to.
                    equal(campaigns.campaigns.TEST001.handlerId);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.triggerId).to.
                    equal(campaigns.campaigns.TEST001.triggerId);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.limits).
                    to.deep.equal(campaigns.campaigns.TEST001.limits);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.message).
                    to.deep.equal(campaigns.campaigns.TEST001.message);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts).
                    to.deep.equal({
                        trigger: 0, show: 0, confirm: 0,
                        postpone: 0, ignore: 0, discard: 0});

           });
       });

        describe('removeCampaign', function() {
            it('should remove campgain', function() {
                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);

                chai.expect(CliqzMsgCenter._removeCampaign, 'TEST002').to.
                    throw('campaign is undefined');
                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);

                CliqzMsgCenter._removeCampaign('TEST001');
                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(0);
           });
       });

        describe('updateCampaigns', function() {
            it('should add campaign from server', function() {
                CliqzMsgCenter._updateCampaignsCallback({response: JSON.stringify(campaigns)});

                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);
            });
            it('should remove campaign not on server', function() {
                CliqzMsgCenter._addCampaign('TEST002', {handlerId: 'xyz'});
                chai.expect(CliqzMsgCenter._campaigns.TEST002.handlerId).to.
                    equal('xyz');

                CliqzMsgCenter._updateCampaignsCallback({response: JSON.stringify({campaigns: {}})});
                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(0);
            });
            it('should not overwrite local campaign', function() {
                CliqzMsgCenter._addCampaign('TEST001', {handlerId: 'xyz'});
                chai.expect(CliqzMsgCenter._campaigns.TEST001.handlerId).to.
                    equal('xyz');

                CliqzMsgCenter._updateCampaignsCallback({response: JSON.stringify(campaigns)});
                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.handlerId).to.
                    equal('xyz');
            });
        });

        describe('saveCampaigns', function() {
            it('should save campaigns', function() {
                CliqzUtils.cliqzPrefs.clearUserPref('msgs.campaigns.ids');
                CliqzUtils.cliqzPrefs.clearUserPref('msgs.campaigns.data.TEST001');
                chai.expect(CliqzUtils.getPref('msgs.campaigns.ids', '')).to.equal('');
                chai.expect(CliqzUtils.getPref('msgs.campaigns.data.TEST001', '')).to.equal('');

                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);

                CliqzMsgCenter._saveCampaigns();
                chai.expect(CliqzUtils.getPref('msgs.campaigns.ids', '')).to.
                    equal(JSON.stringify(Object.keys(CliqzMsgCenter._campaigns)));
                chai.expect(CliqzUtils.getPref('msgs.campaigns.data.TEST001', '')).to.
                    equal(JSON.stringify(CliqzMsgCenter._campaigns.TEST001));
           });
        });

        describe('loadCampaigns', function() {
            it('should load campaigns', function() {
                CliqzUtils.setPref('msgs.campaigns.ids', JSON.stringify(['TEST001']));
                CliqzUtils.setPref('msgs.campaigns.data.TEST001',
                    JSON.stringify(campaigns.campaigns.TEST001));

                CliqzMsgCenter._loadCampaigns();

                chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);
                chai.expect(CliqzMsgCenter._campaigns.TEST001).to.exist;
           });
        });

        describe('triggerCampaign', function() {
            it('should show campaign', function() {
                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
                CliqzMsgCenter._campaigns.TEST001.limits.trigger = 2;
                CliqzMsgCenter._campaigns.TEST001.limits.show = 5;
                var oldShowMessage = CliqzMsgCenter.showMessage;
                wasShown = false;
                CliqzMsgCenter.showMessage = function () {
                    wasShown = true;
                };

                CliqzMsgCenter._triggerCampaign(CliqzMsgCenter._campaigns.TEST001);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('idle');
                CliqzMsgCenter._triggerCampaign(CliqzMsgCenter._campaigns.TEST001);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('show');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.show).to.equal(1);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.trigger).to.equal(0);
                chai.expect(wasShown).to.be.true;

                CliqzMsgCenter.showMessage = oldShowMessage;
            });
            it('should show and end campaign', function() {
                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
                CliqzMsgCenter._campaigns.TEST001.limits.trigger = 2;
                CliqzMsgCenter._campaigns.TEST001.counts.show = 1;
                CliqzMsgCenter._campaigns.TEST001.limits.show = 1;

                CliqzMsgCenter._triggerCampaign(CliqzMsgCenter._campaigns.TEST001);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('idle');
                CliqzMsgCenter._triggerCampaign(CliqzMsgCenter._campaigns.TEST001);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('end');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.show).to.equal(2);
            });
        });

        describe('onMessageAction', function() {
            it('should increment action counts', function() {
                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
                CliqzMsgCenter._campaigns.TEST001.state = 'show';

                CliqzMsgCenter._onMessageAction('TEST001', 'confirm');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.confirm).to.equal(1);
                CliqzMsgCenter._onMessageAction('TEST001', 'ignore');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.ignore).to.equal(1);
                CliqzMsgCenter._onMessageAction('TEST001', 'discard');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.discard).to.equal(1);
                CliqzMsgCenter._onMessageAction('TEST001', 'postpone');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.postpone).to.equal(1);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('idle');
            });
            it('should not increment action counts', function() {
                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
                CliqzMsgCenter._campaigns.TEST001.state = 'end';

                CliqzMsgCenter._onMessageAction('TEST001', 'confirm');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.confirm).to.equal(0);
                CliqzMsgCenter._onMessageAction('TEST001', 'ignore');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.ignore).to.equal(0);
                CliqzMsgCenter._onMessageAction('TEST001', 'discard');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.discard).to.equal(0);
                CliqzMsgCenter._onMessageAction('TEST001', 'postpone');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.postpone).to.equal(0);
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('end');
            });
            it('should end campaign', function() {
                CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
                CliqzMsgCenter._campaigns.TEST001.limits.confirm = 1;

                CliqzMsgCenter._onMessageAction('TEST001', 'confirm');
                chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('end');
            });
        });
   });
};


