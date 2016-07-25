'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CAMPAIGN_SERVER = 'https://fec.cliqz.com/message/',
	ACTIONS = ['confirm', 'ignore', 'discard', 'postpone'],
	PREF_PREFIX = 'msgs.',
	UPDATE_INTERVAL = 60 * 60 * 1000;

/* ************************************************************************* */
function _log(msg) {
	CliqzUtils.log(msg, 'CliqzMsgCenter');
}

function _setPref(pref, val) {
	CliqzUtils.setPref(PREF_PREFIX + pref, val);
}

function _getPref(pref, defaultVal) {
	return CliqzUtils.getPref(PREF_PREFIX + pref, defaultVal);
}

function _clearPref(pref) {
	CliqzUtils.cliqzPrefs.clearUserPref(PREF_PREFIX + pref);
}

function _getEndpoint(endpoint, campaign) {
	return CAMPAIGN_SERVER + (endpoint ? endpoint : '') + '?session=' +
		encodeURIComponent(CliqzUtils.cliqzPrefs.getCharPref('session')) +
		'&lang=' + encodeURIComponent(CliqzUtils.currLocale) +
		(campaign ? '&campaign=' + campaign.id : '');
}

function _telemetry(campaign, action) {
	CliqzUtils.telemetry({
		type: 'campaign',
		id: campaign.id,
		action: action
	});
}
/* ************************************************************************* */

/* ************************************************************************* */
var Campaign = function (id, data) {
	this.id = id;
	this.init();
	this.update(data);
};
Campaign.prototype.init = function () {
	this.state = 'idle';
	this.isEnabled = true;
	this.counts = {trigger: 0, show: 0, confirm: 0,
		           postpone: 0, ignore: 0, discard: 0};
};
Campaign.prototype.update = function (data) {
	for (var key in data) {
		if (data.hasOwnProperty(key) && !key.startsWith('DEBUG')) {
			this[key] = data[key];
		}
	}
};
Campaign.prototype.setState = function (newState) {
	_log(this.id + ': ' + this.state + ' -> ' + newState);
	this.state = newState;
};
Campaign.prototype.save = function () {
	_setPref('campaigns.data.' + this.id, JSON.stringify(this));
	_log('saved campaign ' + this.id);
};
Campaign.prototype.load = function () {
	try {
		this.update(JSON.parse(_getPref('campaigns.data.' + this.id, '{}')));
		_log('loaded campaign ' + this.id);
		return true;
	} catch (e) {
		_log('error loading campaign ' + this.id);
		return false;
	}
};
Campaign.prototype.delete = function () {
	_clearPref('campaigns.data.' + this.id);
};
/* ************************************************************************* */

/* ************************************************************************* */
var Trigger = function (id) {
	this.id = id;
	this._listeners = [];
};
Trigger.prototype.addListener = function(callback) {
	this._listeners.push(callback);
};
Trigger.prototype._notifyListeners = function () {
	for (var i = 0; i < this._listeners.length; i++) {
		this._listeners[i](this.id);
	}
};

var TriggerUrlbarFocus = TriggerUrlbarFocus ||
	new Trigger('TRIGGER_URLBAR_FOCUS');
TriggerUrlbarFocus.init = function (win) {
	win.CLIQZ.Core.urlbar.addEventListener('focus',
		this._onUrlbarFocus);
};
TriggerUrlbarFocus.unload = function (win) {
	win.CLIQZ.Core.urlbar.removeEventListener('focus',
		this._onUrlbarFocus);
};
TriggerUrlbarFocus._onUrlbarFocus = function () {
	TriggerUrlbarFocus._notifyListeners();
};
/* ************************************************************************* */

/* ************************************************************************* */
var MessageHandler = function (id) {
	this.id = id;
	this._windows = [];
	this._messageQueue = [];
	// message id is key
	this._callbacks = {};
};
MessageHandler.prototype.init = function (win) {
	this._windows.push(win);
};
MessageHandler.prototype.unload = function (win) {
	var i = this._windows.indexOf(win);
	if (i > -1) {
		this._windows.splice(i, 1);
	}
};
MessageHandler.prototype.enqueueMessage = function (message, callback) {
	this._messageQueue.push(message);
	this._callbacks[message.id] = callback;
	if (this._messageQueue.length == 1) {
		this._renderMessage(message);
	}
};
MessageHandler.prototype.dequeueMessage = function (message) {
	var i = this._messageQueue.indexOf(message);
	if (i === 0) {
		this.showNextMessage();
	} else if (i > -1) {
		this._messageQueue.splice(i, 1);
		delete this._callbacks[message.id];
	}
};
MessageHandler.prototype.showNextMessage = function () {
	var message = this._messageQueue.shift();
	if (message) {
		delete this._callbacks[message.id];
		this._hideMessage(message);
		if (this._messageQueue.length > 0) {
			this._renderMessage(this._messageQueue[0]);
		}
	}
};

var MessageHandlerDropdownFooter = function () {
	MessageHandler.call(this, MessageHandlerDropdownFooter.id);
};
MessageHandlerDropdownFooter.id = 'MESSAGE_HANDLER_DROPDOWN_FOOTER';
MessageHandlerDropdownFooter.prototype =
	Object.create(MessageHandler.prototype);
MessageHandlerDropdownFooter.prototype.constructor =
	MessageHandlerDropdownFooter;
MessageHandlerDropdownFooter.prototype.parent =
	MessageHandler.prototype;
MessageHandlerDropdownFooter.prototype.init = function (win) {
	this.parent.init.call(this, win);

	win.CLIQZ.Core.popup.addEventListener('popupshowing',
		this._addClickListener);
	// keep reference to this listener
	win.CLIQZ.Core.popup[this.id] = this;
	if (this._messageQueue[0]) {
		this._renderMessage(this._messageQueue[0], win);
	}
};
MessageHandlerDropdownFooter.prototype.unload = function (win) {
	this.parent.unload.call(this, win);
	// usually removed on popup showing, but not if window closed before
	if (win.CLIQZ.Core.popup[this.id]) {
		win.CLIQZ.Core.popup.removeEventListener('popupshowing',
			this._addClickListener);
		delete win.CLIQZ.Core.popup[this.id];
	}

	var msgContainer = win.document.getElementById('cliqz-message-container');
	if (msgContainer) {
		msgContainer.removeEventListener('click', this._onClick);
		delete msgContainer[this.id];
	} else {
		_log('message container not found');
	}
};
MessageHandlerDropdownFooter.prototype._renderMessage = function (message, win) {
	// show in all open windows if win is not specified
	if (win) {
		// TODO: show immediately
		win.CLIQZ.UI.messageCenterMessage =
			message ? this._convertMessage(message) : null;
		if (!message) {
			// hide immediately
			if (win.CLIQZ.Core.popup.cliqzBox &&
				win.CLIQZ.Core.popup.cliqzBox.messageContainer) {
				win.CLIQZ.Core.popup.cliqzBox.messageContainer.innerHTML = '';
			}
		}
	} else {
		this._windows.map(function (w) {
			if (w) { this._renderMessage(message, w); }
		}.bind(this));
	}
};
MessageHandlerDropdownFooter.prototype._hideMessage = function (message) {
	this._renderMessage(null);
};
// converts message into format expected by UI
MessageHandlerDropdownFooter.prototype._convertMessage = function (message) {
	var m = {
		simple_message: message.text,
		type: 'cqz-message-survey',
		options: []
	};

	if (message.options) {
		for (var i = 0; i < message.options.length; i++) {
			m.options.push ({
				text: message.options[i].label,
				state: message.options[i].style,
				action: message.options[i].action
			});
		}
	}

	return {'footer-message': m};
};
MessageHandlerDropdownFooter.prototype._addClickListener = function (e) {
	var popup = e.target,
		win = popup.parentNode.parentNode.parentNode,
		self = popup[MessageHandlerDropdownFooter.id];

	popup.removeEventListener('popupshowing', self._addClickListener);
	delete popup[self.id];

	var msgContainer = win.getElementById('cliqz-message-container');
	if (msgContainer) {
		msgContainer.addEventListener('click', self._onClick);
		msgContainer[self.id] = self;
	} else {
		_log('message container not found');
	}
};
MessageHandlerDropdownFooter.prototype._onClick = function (e) {
	var action = e.target ? e.target.getAttribute('state') : null,
		msgContainer = e.target;
	while (msgContainer && msgContainer.id != 'cliqz-message-container') {
		msgContainer = msgContainer.parentNode;
	}
	if (!msgContainer || msgContainer.id != 'cliqz-message-container') {
		_log('message container not found');
		return;
	}
	var self = msgContainer[MessageHandlerDropdownFooter.id],
	    message = self._messageQueue[0];
	// not thread-safe: if current message is removed while it is showing,
	// the next message is used when invoking the callback
	if (message && self._callbacks[message.id]) {
		self._callbacks[message.id](message.id, action);
	}
};

var MessageHandlerAlert = function () {
	MessageHandler.call(this, MessageHandlerAlert.id);
};
MessageHandlerAlert.id = 'MESSAGE_HANDLER_ALERT';
MessageHandlerAlert.prototype =
	Object.create(MessageHandler.prototype);
MessageHandlerAlert.prototype.constructor =
	MessageHandlerAlert;
MessageHandlerDropdownFooter.prototype.parent =
	MessageHandler.prototype;
MessageHandlerAlert.prototype._renderMessage = function (message) {
	// TODO: wait for window to open
	CliqzUtils.getWindow().alert(message.text);
	if (this._callbacks[message.id]) {
		this._callbacks[message.id](message.id, message.options &&
			message.options.length > 0 && message.options[0].action);
	}
	this.showNextMessage();
};
MessageHandlerAlert.prototype._hideMessage = function () { };
/* ************************************************************************* */

var CliqzMsgCenter = CliqzMsgCenter || {
	_windows: [],
	_campaigns: {},
	_messageHandlers: {},
	_triggers: {},
	_updateTimer: null,

	init: function (win) {
		CliqzMsgCenter._windows.push(win);

		var id;
		for (id in CliqzMsgCenter._triggers) {
			if (CliqzMsgCenter._triggers.hasOwnProperty(id)) {
				CliqzMsgCenter._triggers[id].init(win);
			}
		}
		for (id in CliqzMsgCenter._messageHandlers) {
			if (CliqzMsgCenter._messageHandlers.hasOwnProperty(id)) {
				CliqzMsgCenter._messageHandlers[id].init(win);
			}
		}
	},
	unload: function (win) {
		var i = CliqzMsgCenter._windows.indexOf(win);
		if (i > -1) {
			CliqzMsgCenter._windows.splice(i, 1);
		}

		var id;
		for (id in CliqzMsgCenter._triggers) {
			if (CliqzMsgCenter._triggers.hasOwnProperty(id)) {
				CliqzMsgCenter._triggers[id].unload(win);
			}
		}
		for (id in CliqzMsgCenter._messageHandlers) {
			if (CliqzMsgCenter._messageHandlers.hasOwnProperty(id)) {
				CliqzMsgCenter._messageHandlers[id].unload(win);
			}
		}
	},
	registerTrigger: function (id, trigger) {
		CliqzMsgCenter._triggers[id] = trigger;
		for (var i = 0; i < CliqzMsgCenter._windows.length; i++) {
			trigger.init(CliqzMsgCenter._windows[i]);
		}
		trigger.addListener(CliqzMsgCenter._onTrigger);
	},
	registerMessageHandler: function (id, handler) {
		CliqzMsgCenter._messageHandlers[id] = handler;
		for (var i = 0; i < CliqzMsgCenter._windows.length; i++) {
			handler.init(CliqzMsgCenter._windows[i]);
		}
	},
	showMessage: function (message, handlerId, callback) {
		var handler =
			CliqzMsgCenter._messageHandlers[handlerId];
		if (handler) {
			handler.enqueueMessage(message, callback);
		} else {
			_log('message handler not found: ' + handlerId);
		}
	},

	_activateCampaignUpdates: function () {
		if (!CliqzMsgCenter._updateTimer) {
			// run once now
			CliqzMsgCenter._updateCampaigns();
			CliqzMsgCenter._updateTimer = CliqzUtils.setInterval(function () {
				if (CliqzMsgCenter) {
					CliqzMsgCenter._updateCampaigns();
				}
			}, UPDATE_INTERVAL);
		}
	},
	_deactivateCampaignUpdates: function () {
		CliqzUtils.clearTimeout(CliqzMsgCenter._updateTimer);
		CliqzMsgCenter._updateTimer = null;
	},
	_updateCampaigns: function () {
		_log('updating campaigns');
		CliqzUtils.httpGet(_getEndpoint(),
			CliqzMsgCenter._updateCampaignsCallback,
			function error(e) {
    			_log('error updating campaigns: ' + e);
    		});
	},
	_updateCampaignsCallback: function (req) {
		try {
    		var clientCampaigns = CliqzMsgCenter._campaigns,
    		    serverCampaigns = JSON.parse(req.response).campaigns,
    		    cId;

    		for (cId in serverCampaigns) {
    			if (serverCampaigns.hasOwnProperty(cId) &&
    			    !(cId in clientCampaigns)) {
    				CliqzMsgCenter._addCampaign(cId, serverCampaigns[cId]);
    			}
    		}
    		for (cId in clientCampaigns) {
    			if (clientCampaigns.hasOwnProperty(cId) &&
    				!(cId in serverCampaigns)) {
    				CliqzMsgCenter._removeCampaign(cId);
    			}
    		}
    		CliqzMsgCenter._saveCampaigns();
		} catch (e) {
			_log('error parsing campaigns: ' + e);
		}
	},
	_addCampaign: function (id, data) {
		CliqzMsgCenter._campaigns[id] = new Campaign(id, data);
		CliqzUtils.httpGet(_getEndpoint('accept', CliqzMsgCenter._campaigns[id]));
		_telemetry(CliqzMsgCenter._campaigns[id], 'add');
		_log('added campaign ' + id);
	},
	_removeCampaign: function (id) {
		var campaign = CliqzMsgCenter._campaigns[id],
			handler = CliqzMsgCenter._messageHandlers[campaign.handlerId];
		if (handler) {
			handler.dequeueMessage(campaign.message);
		}
		campaign.delete();
		delete CliqzMsgCenter._campaigns[id];
		_telemetry(campaign, 'remove');
		_log('removed campaign ' + id);
	},
	_loadCampaigns: function () {
		_log('loading campaigns');
		try {
			var cIds = JSON.parse(_getPref('campaigns.ids', '[]'));
			for (var i = 0; i < cIds.length; i++) {
				var campaign = new Campaign(cIds[i]);
				if (campaign.load()) {
					CliqzMsgCenter._campaigns[cIds[i]] = campaign;
					if (campaign.state == 'show') {
						CliqzMsgCenter.showMessage(campaign.message,
							campaign.handlerId,
							CliqzMsgCenter._onMessageAction);
					}
				} else {
					campaign.delete();
				}
			}
		} catch (e) {
			_log('error loading campaigns: ' + e);
		}
	},
	_saveCampaigns: function () {
		_log('saving campaigns');
		_setPref('campaigns.ids',
			JSON.stringify(Object.keys(CliqzMsgCenter._campaigns)));
		for (var cId in CliqzMsgCenter._campaigns) {
			if (CliqzMsgCenter._campaigns.hasOwnProperty(cId)) {
				CliqzMsgCenter._campaigns[cId].save();
			}
		}
	},
	_onTrigger: function (id) {
		_log(id + ' trigger');

		// find all campaigns for this trigger
		var campaigns = CliqzMsgCenter._campaigns;
		for (var cId in campaigns) {
			if (campaigns.hasOwnProperty(cId)) {
				if (campaigns[cId].triggerId == id) {
					CliqzMsgCenter._triggerCampaign(campaigns[cId]);
				}
			}
		}
	},
	_triggerCampaign: function (campaign) {
		_log('campaign ' + campaign.id + ' trigger');
		if (campaign.isEnabled && campaign.state == 'idle') {
			if (++campaign.counts.trigger == campaign.limits.trigger) {
				if (campaign.limits.show == -1 ||
					++campaign.counts.show <= campaign.limits.show) {
					campaign.setState('show');
					campaign.counts.trigger = 0;
					// need ID in message to associate callback with campaign
					campaign.message.id = campaign.id;
					CliqzMsgCenter.showMessage(campaign.message,
						campaign.handlerId, CliqzMsgCenter._onMessageAction);
					CliqzUtils.httpGet(_getEndpoint('show', campaign));
					_telemetry(campaign, 'show');
				} else {
					campaign.setState('end');
				}
				CliqzMsgCenter._updateCampaigns();
			}
			campaign.save();
		}
	},
	_onMessageAction: function (campaignId, action) {
		var campaign = CliqzMsgCenter._campaigns[campaignId];
		if (campaign) {
			if (campaign.state == 'end') {
				_log('campaign ' + campaign.id + ' has ended');
				return;
			}

			if (ACTIONS.indexOf(action) != -1) {
				_log('campaign ' + campaign.id + ': ' + action);
				_telemetry(campaign, action);

				if (campaign.limits[action] != -1 ||
					++campaign.counts[action] == campaign.limits[action]) {
					campaign.setState('end');

					if (action == 'confirm') {
						CliqzUtils.httpGet(_getEndpoint('click', campaign));
						// TODO: potentially move to method
						var gBrowser = CliqzUtils.getWindow().gBrowser;
						for (var i = 0; i < campaign.message.options.length; i++) {
							if (campaign.message.options[i].action == action &&
								campaign.message.options[i].url) {
									gBrowser.selectedTab =
										gBrowser.addTab(campaign.message.options[i].url);
							}
						}
					}
				} else {
					campaign.setState('idle');
				}

				CliqzMsgCenter._messageHandlers[campaign.handlerId].
					dequeueMessage(campaign.message);
			}

			if (campaign.counts.show == campaign.limits.show) {
				campaign.setState('end');
			}
			campaign.save();
		} else {
			_log('campaign ' + campaignId + ' not found');
		}
		CliqzMsgCenter._updateCampaigns();
	},
};

CliqzMsgCenter.registerTrigger(TriggerUrlbarFocus.id,
	TriggerUrlbarFocus);
CliqzMsgCenter.registerMessageHandler(MessageHandlerDropdownFooter.id,
	new MessageHandlerDropdownFooter());
CliqzMsgCenter.registerMessageHandler(MessageHandlerAlert.id,
	new MessageHandlerAlert());

CliqzMsgCenter._loadCampaigns();
CliqzMsgCenter._activateCampaignUpdates();









