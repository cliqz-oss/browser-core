import RegexProxyRule from 'unblock/regexp-proxy-rule';
import ResourceLoader from 'core/resource-loader';
import { utils } from 'core/cliqz';

Components.utils.import('resource://gre/modules/Services.jsm');

const REFRESH_RETRIES = 2;

function queryHTML(...args) {
  return utils.callAction('core', 'queryHTML', args);
}

export default class {
  /**
  * DNS Filter for unblocking YT videos
  * @class Youtube
  * @namespace unblock
  * @constructor
  */
  constructor() {
    this.current_region = '';
    this.video_info = {};
    this.video_lookup_cache = new Set();
    this.proxied_videos = new Set();
    this.last_success = null;
    this.conf = {};
    this.CONFIG_URL = "https://cdn.cliqz.com/unblock/yt_unblock_config.json";
    this.proxy_manager = null;
    this.proxy_service = null;
    this.request_listener = null;
    this.on_block_cb = null;
    this.notification_cb = null;
    this.initialized = false;
  }

  /**
  * @method canFilter
  * @param url {string}
  */
  canFilter(url) {
    return url.indexOf("https://www.youtube.com") > -1;
  }

  /**
  * @method init
  * @param proxy_manager
  * @param proxy_service
  * @param request_listener
  * @param on_block_cb
  * @param notification_cb
  */
  init(proxy_manager, proxy_service, request_listener, on_block_cb, notification_cb) {
    var self = this;
    this.proxy_manager = proxy_manager;
    this.proxy_service = proxy_service;
    this.request_listener = request_listener;
    this.on_block_cb = on_block_cb;
    this.notification_cb = notification_cb;

    this.request_listener.subscribe({
      text: 'https://www.youtube.com/watch',
      callback: function(url) {
        return self.shouldProxy(url);
      }
    });

    this._loader = new ResourceLoader(
      ['unblock', 'yt_unblock_config.json'],
      {
        remoteURL: this.CONFIG_URL,
        cron: 24 * 60 * 60 * 1000,
      }
    );
    var updateConfig = (config) => this.conf = config;
    this._loader.load().then(updateConfig);
    this._loader.onUpdate(updateConfig);
    this.initialized = true;
  }

  /**
  * @method unload
  */
  unload() {
    this._loader.stop();
  }

  /**
  * @method refresh
  */
  refresh() {
    // reset internal caches
    this.video_info = {};
  }

  /**
  * @method updateProxyRule
  * @param vid {Number} Video id
  */
  updateProxyRule(vid) {
    var block_info = this.video_info[vid];
    let regex = this.getURLRegex(vid);
    // make a new rule
    if (block_info.is_blocked && !block_info.proxy_region && block_info.allowed_regions.length > 0) {
      let region = this.proxy_manager.getPreferredRegion(block_info.allowed_regions);
      let proxy = this.proxy_manager.getNextProxy(region);
      if (proxy) {
        var rule = new RegexProxyRule(regex, proxy, region);
        this.proxy_service.addProxyRule(rule);
        block_info.proxy_region = region;
        // revert rule after 1 minute
        CliqzUtils.setTimeout(function() {
          this.video_info[vid].proxy_region = undefined;
          this.proxy_service.removeProxyRule(rule);
        }.bind(this), 60000);
      }
    }
  }

  /**
  * @method getURLRegex
  * @param vid {Number} Video id
  */
  getURLRegex(vid) {
    return new RegExp("^https://www.youtube.com/watch\\?.*v="+vid);
  }

  /**
  * @method pageObserver
  * @param doc
  */
  pageObserver(url) {
    var vid = this.getVideoID(url),
      proxied = this.video_info[vid] && this.video_info[vid].proxy_region,
      blocking_detected = this.video_info[vid] && this.video_info[vid].is_blocked,
      waitOnRefresh = this.video_info[vid] && this.video_info[vid].refreshed && Date.now() - this.video_info[vid].refreshed < 500;

    if(vid != undefined && !waitOnRefresh) {

      if(!proxied) {
        // detect user locale from youtube logo
        queryHTML(url, this.conf.locale_element_selector, 'innerText').then((locale) => {
          try {
            if (locale[0]) {
              CliqzUtils.log("YT locale = " + locale[0], "unblock");
              this.current_region = locale[0];
            }
          } catch(e) {
            utils.log("Locale exception: " + e.toString(), "unblock");
          }
        });
      }

      this.isVideoBlocked(url).then((isBlocked) => {
        if (isBlocked) {
          let allowed_regions = [];
          if (!proxied) {
            // normal block, add blocked entry and reload page
            CliqzUtils.log("blocked video: "+ vid, "unblock");
            // add blocked entry
            allowed_regions = new Set(this.proxy_manager.getAvailableRegions());
            allowed_regions.delete(this.current_region);
            // set video info data
            this.video_info[vid] = this.video_info[vid] || {};
            this.video_info[vid].is_blocked = true;
            this.video_info[vid].blocked_regions = [this.current_region];
            this.video_info[vid].allowed_regions = Array.from(allowed_regions);

            CliqzUtils.log('Add blocked youtube page', 'unblock');
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'yt_blocked_message',
              'region': this.current_region
            });
          } else {
            // proxy was also blocked, remove region from allow list
            allowed_regions = new Set(this.video_info[vid].allowed_regions);
            allowed_regions.delete(this.video_info[vid].proxy_region || '');
            this.video_info[vid].allowed_regions = Array.from(allowed_regions);
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'yt_blocked_2',
              'region': this.video_info[vid].proxy_region || '',
              'remaining': allowed_regions.size
            });
            if (allowed_regions.size == 0) {
              this.notification_cb(url, utils.getLocalizedString('unblock_youtube_fail'));
            }
          }

          // reload if we have a useable proxy region
          if(allowed_regions.size > 0) {
            // tell unblock that we can unblock here
            var self = this;
            this.on_block_cb(url, function() {
              CliqzUtils.telemetry({
                'type': 'unblock',
                'action': 'yt_retry',
                'regions': Array.from(allowed_regions)
              });
              self.updateProxyRule(vid);
              self.video_info[vid].refreshed = Date.now();
              self.refreshPageForVideo(url);
            });
          }
        }

        // If we proxied and now the video isn't blocked, we have been successful!
        // We also cache the url to prevent multiple triggering of this signal, as this function
        // is triggered multiple times for a single video load.
        if (proxied && !isBlocked && url != this.last_success) {
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'yt_success'
          });
          this.last_success = url;

          // check for loading failure
          CliqzUtils.setTimeout(() => {
            this.checkLoadError(url, 0)
          }, 1000);
        }

      });
    }
  }

  /**
  * @method checkLoadError
  * @param url {string}
  * @param t
  */
  checkLoadError(url, t) {
    // see if error message is visible
    queryHTML(url, '.ytp-error', 'offsetParent').then((offsetParent) => {
      // if zero results, then this url probably isn't open in our tabs anymore
      // so we should stop checking for errors.
      if (offsetParent.length === 0) {
        return;
      }

      let error = false;
      try {
        error = offsetParent[0] !== null;
      } catch(e) {
      }
      // send telemetry if video times out, otherwise check again later.
      if (error) {
        utils.telemetry({
          type: 'unblock',
          action: 'yt_timeout',
          t: t
        });
      } else {
        utils.setTimeout(() => {
          this.checkLoadError(url, t + 1);
        }, 1000);
      }
    });
  }
  /**
  * @method getVideoID
  * @param url {string}
  */
  getVideoID(url) {
    let url_parts = CliqzUtils.getDetailsFromUrl(url),
      query = getParametersQS(url_parts.query);
    if(url_parts.path == '/watch' &&
        'v' in query) {
      return query['v'];
    } else {
      return undefined;
    }
  }

  /**
  * @method isVideoBlocked
  * @param doc
  */
  isVideoBlocked(url) {
    // check for block message
    return new Promise( (resolve, reject) => {
      queryHTML(url, this.conf.blocked_video_element, 'offsetParent').then((offsetParent) => {
        try {
          resolve(offsetParent.length > 0 && offsetParent[0] !== null);
        } catch(e) {
          reject();
        }
      });
    });
  }
  /**
  * @method shouldProxy
  * @param url {string}
  */
  shouldProxy(url) {
    if (url.indexOf("https://www.youtube.com/watch") == -1) {
      return false;
    }
    // check if config is loaded
    if (!this.conf.api_url) {
      return false;
    }
    var self = this;

    var vid = this.getVideoID(url),
      proxied = this.video_info[vid] && this.video_info[vid].proxy_region;
    if(vid && vid.length > 0) {
      // check block cache
      if(vid in this.video_info && this.video_info[vid].is_blocked &&
        this.video_info[vid].allowed_regions.indexOf(this.current_region) == -1) {
        if (proxied) {
          // proxy rule already exists
          return;
        }
        // blocking was detected, but no proxy rule yet, maybe we need permission?
        CliqzUtils.setTimeout(function() {
          self.on_block_cb(url, function() {
            self.updateProxyRule(vid);
            self.refreshPageForVideo(vid);
          });
        }, 100);
        return;
      }
      // lookup api
      if (!(this.video_info[vid] && this.video_info[vid].lookup)) {
        this.video_info[vid] = this.video_info[vid] || {}
        this.video_info[vid].lookup = true;

        CliqzUtils.httpGet(this.conf.api_url.replace('{video_id}', vid), function(req) {
          if (self.conf.api_check.not_blocked_if.every(function(test) { return req.response.indexOf(test) == -1})
            && self.conf.api_check.blocked_if.some(function(test) { return req.response.indexOf(test) > -1})) {
            // error code,
            let allowed_regions = new Set(self.proxy_manager.getAvailableRegions());
            allowed_regions.delete(self.current_region);
            self.video_info[vid].is_blocked = true;
            self.video_info[vid].blocked_regions = [self.current_region]
            self.video_info[vid].allowed_regions = Array.from(allowed_regions);
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'yt_blocked_api',
              'region': self.current_region
            });

            CliqzUtils.setTimeout(function() {
              self.on_block_cb(url, function() {
                // try to refresh page
                self.updateProxyRule(vid);
                self.video_info[vid].refreshed = Date.now();
                self.refreshPageForVideo(vid);
              });
            }, 100);
          }
        });
      }
    }
    return false;
  }

  /** Adapted from getCDByURL on CliqzHumanWeb. Finds the tab(s) which have this video in them, and refreshes.
   * @method refreshPageForVideo
   * @param vid {Number} Video id
   * @param retry_count {Number} Number of retries
   */
  refreshPageForVideo(vid, retry_count) {
    var enumerator = Services.wm.getEnumerator('navigator:browser'),
        found = false,
    retry_count = retry_count || REFRESH_RETRIES;
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      var gBrowser = win.gBrowser;
      if (gBrowser.tabContainer) {
        var numTabs = gBrowser.tabContainer.childNodes.length;
        for (var i=0; i<numTabs; i++) {
          var currentTab = gBrowser.tabContainer.childNodes[i];
          var currentBrowser = gBrowser.getBrowserForTab(currentTab);
          var currURL= currentBrowser.currentURI.spec;

          if(currURL.indexOf(vid) > -1 && currURL.indexOf('www.youtube.com') > -1) {
            currentBrowser.reload();
            found = true;
          }
        }
      }
    }
    if (!found && retry_count > 0) {
      CliqzUtils.setTimeout(function() {
        this.refreshPageForVideo(vid, retry_count-1);
      }.bind(this), 400);
    }
  }
}

// -- getParametersQS function from CliqzAttrack, replace after attrack is merged into master

var getParametersQS = function(qs) {
  var res = {};
  let state = 'key';
  let k = '';
  let v = '';

  for(let i=0; i<qs.length; i++) {
      let c = qs.charAt(i);
      if(c == '=' && state == 'key' && k.length > 0) {
          state = 'value';
          continue;
      } else if(c == '&' || c == ';') {
          if(state == 'value') {
              state = 'key';
              res[k] = v;
          } else if(state == 'key' && k.length > 0) {
              // key with no value, set value=true
              res[k] = true;
          }
          k = '';
          v = '';
          continue;
      }
      switch(state) {
          case 'key':
              k += c;
              break;
          case 'value':
              v += c;
              break;
      }
  }
  if(state == 'value') {
      state = 'key';
      res[k] = v;
  } else if(state == 'key' && k.length > 0) {
      res[k] = true;
  }
  return res;
};
