import CliqzEvents from "core/events";
import CliqzUtils from "core/utils";
import CliqzCampaign from "campaign-manager/campaign";
import CliqzCampaignTriggerUrlbarFocus from "campaign-manager/triggers/urlbar-focus";


function CliqzCampaignManager() {
    this._campaigns = {};
    this._triggers = {};
    this._updateTimer = null;

    this.ACTIONS = ['confirm', 'ignore', 'discard', 'postpone'];
    this.CAMPAIGN_SERVER = 'https://fec.cliqz.com/message/';
    this.PREF_PREFIX = 'msgs.';
    this.UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour

    this.registerTrigger(CliqzCampaignTriggerUrlbarFocus.id,
        new CliqzCampaignTriggerUrlbarFocus());

    this.loadCampaigns();
    this.activateCampaignUpdates();
}

CliqzCampaignManager.prototype = {
  registerTrigger: function (id, trigger) {
      this._triggers[id] = trigger;
      trigger.addListener(this._onTrigger.bind(this));
  },
  activateCampaignUpdates: function () {
      if (!this._updateTimer) {
          // run once now
          this.updateCampaigns();
          this._updateTimer = CliqzUtils.setInterval(
            () => this.updateCampaigns(),
            this.UPDATE_INTERVAL);
      }
  },
  deactivateCampaignUpdates: function () {
      CliqzUtils.clearTimeout(this._updateTimer);
      this._updateTimer = null;
  },
  loadCampaigns: function () {
      this.log('loading campaigns');
      try {
          var cIds = JSON.parse(
            CliqzUtils.getPref(this.PREF_PREFIX + 'campaigns.ids', '[]'));
          cIds.forEach(function (cId) {
              var campaign = new CliqzCampaign(cId);
              try {
                campaign.load();
                this._campaigns[cId] = campaign;
                if (campaign.state === 'show') {
                    CliqzEvents.pub('msg_center:show_message',
                      campaign.message,
                      campaign.handlerId,
                      this._onMessageAction.bind(this));
                }
              } catch (e) {
                this.log('error loading campaign ' + campaign.id);
                campaign.delete();
              }
          }.bind(this));
      } catch (e) {
          this.log('error loading campaigns: ' + e);
      }
  },
  saveCampaigns: function () {
      this.log('saving campaigns');
      CliqzUtils.setPref(this.PREF_PREFIX + 'campaigns.ids',
          JSON.stringify(Object.keys(this._campaigns)));
      for (var cId in this._campaigns) {
          if (this._campaigns.hasOwnProperty(cId)) {
              this._campaigns[cId].save();
          }
      }
  },
  updateCampaigns: function () {
      this.log('updating campaigns');
      CliqzUtils.httpGet(this.getEndpoint(),
          this._onCampaignsUpdate.bind(this),
          e => this.log('error updating campaigns: ' + e));
  },
  addCampaign: function (id, data) {
      this._campaigns[id] = new CliqzCampaign(id, data);
      CliqzUtils.httpGet(this.getEndpoint('accept', this._campaigns[id]));
      this.telemetry(this._campaigns[id], 'add');
      this.log('added campaign ' + id);
  },
  removeCampaign: function (id) {
      var campaign = this._campaigns[id];
      CliqzEvents.pub('msg_center:hide_message', campaign.message, campaign.handlerId);
      campaign.delete();
      delete this._campaigns[id];
      this.telemetry(campaign, 'remove');
      this.log('removed campaign ' + id);
  },
  _onMessageAction: function (campaignId, action) {
      var campaign = this._campaigns[campaignId];
      if (campaign) {
          if (campaign.state === 'end') {
              this.log('campaign ' + campaign.id + ' has ended');
              return;
          }

          if (this.ACTIONS.indexOf(action) !== -1) {
              this.log('campaign ' + campaign.id + ': ' + action);
              this.telemetry(campaign, action);

              if (action === 'confirm') {
                  CliqzUtils.httpGet(this.getEndpoint('click', campaign));
              } else if (action === 'postpone') {
                  CliqzUtils.httpGet(this.getEndpoint('postpone', campaign));
              } else if (action === 'discard') {
                  CliqzUtils.httpGet(this.getEndpoint('discard', campaign));
              }

              // open URL in new tab if specified for this action
              var gBrowser = CliqzUtils.getWindow().gBrowser;
              campaign.message.options.forEach(function (option) {
                  if (option.action === action && option.url) {
                      gBrowser.selectedTab = gBrowser.addTab(option.url);
                  }
              });

              // end campaign if limit reached
              if (campaign.limits[action] !== -1 &&
                  ++campaign.counts[action] === campaign.limits[action]) {
                  campaign.setState('end');
              } else {
                  campaign.setState('idle');
              }

              CliqzEvents.pub('msg_center:hide_message', campaign.message, campaign.handlerId);
          }

          if (campaign.counts.show === campaign.limits.show) {
              campaign.setState('end');
          }
          campaign.save();
      } else {
          this.log('campaign ' + campaignId + ' not found');
      }
      this.updateCampaigns();
  },
  _onTrigger: function (id) {
      this.log(id + ' trigger');

      // find all campaigns for this trigger
      var campaigns = this._campaigns;
      for (var cId in campaigns) {
          if (campaigns.hasOwnProperty(cId)) {
              if (campaigns[cId].triggerId === id) {
                  this._triggerCampaign(campaigns[cId]);
              }
          }
      }
  },
  _triggerCampaign: function (campaign) {
      this.log('campaign ' + campaign.id + ' trigger');
      if (campaign.isEnabled && campaign.state === 'idle') {
          if (++campaign.counts.trigger === campaign.limits.trigger) {
              if (campaign.limits.show === -1 ||
                  ++campaign.counts.show <= campaign.limits.show) {
                  campaign.setState('show');
                  campaign.counts.trigger = 0;
                  // need ID in message to associate callback with campaign
                  campaign.message.id = campaign.id;
                  CliqzEvents.pub('msg_center:show_message', campaign.message,
                      campaign.handlerId, this._onMessageAction.bind(this));
                  CliqzUtils.httpGet(this.getEndpoint('show', campaign));
                  this.telemetry(campaign, 'show');
              } else {
                  campaign.setState('end');
              }
              this.updateCampaigns();
          }
          campaign.save();
      }
  },
  _onCampaignsUpdate: function (req) {
      try {
          var clientCampaigns = this._campaigns,
              serverCampaigns = JSON.parse(req.response).campaigns,
              cId;

          for (cId in serverCampaigns) {
              if (serverCampaigns.hasOwnProperty(cId) &&
                  !(cId in clientCampaigns)) {
                  this.addCampaign(cId, serverCampaigns[cId]);
              }
          }
          for (cId in clientCampaigns) {
              if (clientCampaigns.hasOwnProperty(cId) &&
                  !(cId in serverCampaigns)) {
                  this.removeCampaign(cId);
              }
          }
          this.saveCampaigns();
      } catch (e) {
          this.log('error parsing campaigns: ' + e);
      }
  },

  log: function (msg) {
    CliqzUtils.log(msg, 'CliqzCampaignManager');
  },

  telemetry: function (campaign, action) {
    CliqzUtils.telemetry({
        type: 'campaign',
        id: campaign.id,
        action: action
    });
  },

  getEndpoint: function (endpoint, campaign) {
    return this.CAMPAIGN_SERVER + (endpoint ? endpoint : '') + '?session=' +
        encodeURIComponent(CliqzUtils.getPref('session')) +
        '&lang=' + encodeURIComponent(CliqzUtils.currLocale) +
        (campaign ? '&campaign=' + campaign.id : '');
  }
};

CliqzCampaignManager.getInstance = function () {
  CliqzCampaignManager.getInstance.instance =
    CliqzCampaignManager.getInstance.instance || new CliqzCampaignManager();
  return CliqzCampaignManager.getInstance.instance;
};
CliqzCampaignManager.getInstance();

export default CliqzCampaignManager;
