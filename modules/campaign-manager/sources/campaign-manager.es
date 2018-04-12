/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */

import CliqzEvents from '../core/events';
import CliqzUtils from '../core/utils';
import CliqzCampaign from './campaign';
import CliqzCampaignTriggerUrlbarFocus from './triggers/urlbar-focus';
import config from '../core/config';


function CliqzCampaignManager() {
  this._campaigns = {};
  this._triggers = {};
  this._updateTimer = null;
  this.ACTIONS = ['confirm', 'ignore', 'discard', 'postpone'];
  this.CAMPAIGN_SERVER = config.settings.CAMPAIGN_SERVER;
  this.PREF_PREFIX = 'msgs.';
  this.UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour

  this.registerTrigger(CliqzCampaignTriggerUrlbarFocus.id,
    new CliqzCampaignTriggerUrlbarFocus());

  this.loadCampaigns();
  this.activateCampaignUpdates();
}

CliqzCampaignManager.prototype = {
  registerTrigger(id, trigger) {
    this._triggers[id] = trigger;
    trigger.addListener(this._onTrigger.bind(this));
  },
  activateCampaignUpdates() {
    if (!this._updateTimer) {
      // run once now
      this.updateCampaigns();
      this._updateTimer = CliqzUtils.setInterval(
        () => this.updateCampaigns(),
        this.UPDATE_INTERVAL);
    }
  },
  deactivateCampaignUpdates() {
    CliqzUtils.clearTimeout(this._updateTimer);
    this._updateTimer = null;
  },
  loadCampaigns() {
    this.log('loading campaigns');
    try {
      const cIds = JSON.parse(
        CliqzUtils.getPref(`${this.PREF_PREFIX}campaigns.ids`, '[]'));
      cIds.forEach((cId) => {
        const campaign = new CliqzCampaign(cId);
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
          this.log(`error loading campaign ${campaign.id}`);
          campaign.delete();
        }
      });
    } catch (e) {
      this.log(`error loading campaigns: ${e}`);
    }
  },
  saveCampaigns() {
    this.log('saving campaigns');
    CliqzUtils.setPref(`${this.PREF_PREFIX}campaigns.ids`,
      JSON.stringify(Object.keys(this._campaigns)));
    for (const cId in this._campaigns) {
      if (Object.prototype.hasOwnProperty.call(this._campaigns, cId)) {
        this._campaigns[cId].save();
      }
    }
  },
  updateCampaigns() {
    this.log('updating campaigns');
    CliqzUtils.httpGet(this.getEndpoint(),
      this._onCampaignsUpdate.bind(this),
      e => this.log(`error updating campaigns: ${e}`));
  },
  addCampaign(id, data) {
    this._campaigns[id] = new CliqzCampaign(id, data);
    CliqzUtils.httpGet(this.getEndpoint('accept', this._campaigns[id]));
    this.telemetry(this._campaigns[id], 'add');
    this.log(`added campaign ${id}`);
  },
  removeCampaign(id) {
    const campaign = this._campaigns[id];
    CliqzEvents.pub('msg_center:hide_message', campaign.message, campaign.handlerId);
    campaign.delete();
    delete this._campaigns[id];
    this.telemetry(campaign, 'remove');
    this.log(`removed campaign ${id}`);
  },
  _onMessageAction(campaignId, action) {
    const campaign = this._campaigns[campaignId];
    if (campaign) {
      if (campaign.state === 'end') {
        this.log(`campaign ${campaign.id} has ended`);
        return;
      }

      if (this.ACTIONS.indexOf(action) !== -1) {
        this.log(`campaign ${campaign.id}: ${action}`);
        this.telemetry(campaign, action);

        if (action === 'confirm') {
          CliqzUtils.httpGet(this.getEndpoint('click', campaign));
        } else if (action === 'postpone') {
          CliqzUtils.httpGet(this.getEndpoint('postpone', campaign));
        } else if (action === 'discard') {
          CliqzUtils.httpGet(this.getEndpoint('discard', campaign));
        }

        // open URL in new tab if specified for this action
        const gBrowser = CliqzUtils.getWindow().gBrowser;
        campaign.message.options.forEach((option) => {
          if (option.action === action && option.url) {
            gBrowser.selectedTab = gBrowser.addTab(option.url);
          }
        });

        // end campaign if limit reached
        if (campaign.limits[action] !== -1) {
          campaign.counts[action] += 1;

          if (campaign.counts[action] === campaign.limits[action]) {
            campaign.setState('end');
          } else {
            campaign.setState('idle');
          }
        }

        CliqzEvents.pub('msg_center:hide_message', campaign.message, campaign.handlerId);
      }

      if (campaign.counts.show === campaign.limits.show) {
        campaign.setState('end');
      }
      campaign.save();
    } else {
      this.log(`campaign ${campaignId} not found`);
    }
    this.updateCampaigns();
  },
  _onTrigger(id) {
    this.log(`${id} trigger`);

    // find all campaigns for this trigger
    const campaigns = this._campaigns;
    for (const cId in campaigns) {
      if (Object.prototype.hasOwnProperty.call(campaigns, cId)) {
        if (campaigns[cId].triggerId === id) {
          this._triggerCampaign(campaigns[cId]);
        }
      }
    }
  },
  _triggerCampaign(campaign) {
    this.log(`campaign ${campaign.id} trigger`);
    if (campaign.isEnabled && campaign.state === 'idle') {
      campaign.counts.trigger += 1;
      if (campaign.counts.trigger === campaign.limits.trigger) {
        if (campaign.limits.show === -1 ||
            campaign.counts.show + 1 <= campaign.limits.show) {
          campaign.counts.show += 1;
          campaign.setState('show');
          campaign.counts.trigger = 0;
          // need ID in message to associate callback with campaign
          campaign.message.id = campaign.id;
          CliqzEvents.pub('msg_center:show_message', campaign.message,
            campaign.handlerId, this._onMessageAction.bind(this));
          CliqzUtils.httpGet(this.getEndpoint('show', campaign));
          this.telemetry(campaign, 'show');
        } else {
          campaign.counts.show += 1;
          campaign.setState('end');
        }
        this.updateCampaigns();
      }
      campaign.save();
    }
  },
  _onCampaignsUpdate(req) {
    try {
      const clientCampaigns = this._campaigns;
      const serverCampaigns = JSON.parse(req.response).campaigns;
      let cId;

      for (cId in serverCampaigns) {
        if (Object.prototype.hasOwnProperty.call(serverCampaigns, cId) &&
          !(cId in clientCampaigns)) {
          this.addCampaign(cId, serverCampaigns[cId]);
        }
      }
      for (cId in clientCampaigns) {
        if (Object.prototype.hasOwnProperty.call(clientCampaigns, cId) &&
          !(cId in serverCampaigns)) {
          this.removeCampaign(cId);
        }
      }
      this.saveCampaigns();
    } catch (e) {
      this.log(`error parsing campaigns: ${e}`);
    }
  },

  log(msg) {
    CliqzUtils.log(msg, 'CliqzCampaignManager');
  },

  telemetry(campaign, action) {
    CliqzUtils.telemetry({
      type: 'campaign',
      id: campaign.id,
      action
    });
  },

  getEndpoint(endpoint, campaign) {
    const _campaignServer = this.CAMPAIGN_SERVER;
    // Even though it should work the same, this breaks the extension:
    // const _endpoint = (endpoint || '');
    // eslint-disable-next-line no-unneeded-ternary
    const _endpoint = (endpoint ? endpoint : '');
    const _session = encodeURIComponent(CliqzUtils.getPref('session'));
    const _lang = encodeURIComponent(CliqzUtils.currLocale);
    const _campaign = (campaign ? `&campaign=${campaign.id}` : '');
    return `${_campaignServer}${_endpoint}?session=${_session}&lang=${_lang}${_campaign}`;
  }
};

// eslint-disable-next-line func-names
CliqzCampaignManager.getInstance = function () {
  CliqzCampaignManager.getInstance.instance =
    CliqzCampaignManager.getInstance.instance || new CliqzCampaignManager();
  return CliqzCampaignManager.getInstance.instance;
};
CliqzCampaignManager.getInstance();

export default CliqzCampaignManager;
