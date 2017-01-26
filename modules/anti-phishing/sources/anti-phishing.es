import CliqzHumanWeb from "human-web/human-web";
import utils from 'core/utils';

const BW_URL = "https://antiphishing.cliqz.com/api/bwlist?md5=";
const WARNING = 'chrome://cliqz/content/anti-phishing/phishing-warning.html';
const Ci = Components.interfaces;

function queryHTML(...args) {
  return utils.callAction('core', 'queryHTML', args);
}

function getHTML(...args) {
  return utils.callAction('core', 'getHTML', args);
}

function format(currWin, url, md5, logging, domWinID) {
    let doc = currWin.document;
    if (!(doc.getElementById('phishing-url'))) {
      setTimeout(() => {
        format(currWin, url, md5, logging, domWinID);
      }, 100);
    } else {
      doc.getElementById('phishing-url').innerText = url;
      const validUrl = CliqzAntiPhishing.getValidUrl(domWinID);
      delete CliqzAntiPhishing.history[domWinID];
      doc.getElementsByClassName('cqz-button-save-out')[0].onclick = function() {
        if (logging) {
          CliqzUtils.telemetry({type: 'anti-phishing', action: 'click', target: 'safe_out'});
          // Modify human-web url to log the user interactions
          // Note: there might be loss of data due to double fetch
          if (CliqzHumanWeb && CliqzHumanWeb.state.v[url]) {
            CliqzHumanWeb.state.v[url]['anti-phishing'] = 'safe_out';
          }
        }
        currWin.location.replace(validUrl);
      };

      if (logging) {
        doc.getElementById('learn-more').onclick = function() {
          CliqzUtils.telemetry({type: 'anti-phishing', action: 'click', target: 'learn_more'});
        }
      }
      doc.getElementById('report-safe').onclick = function() {
        if (logging) {
          CliqzUtils.telemetry({type: 'anti-phishing', action: 'click', target: 'report'});
          if (CliqzHumanWeb && CliqzHumanWeb.state.v[url]) {
            CliqzHumanWeb.state.v[url]['anti-phishing'] = 'report';
          }
        }
        CliqzAntiPhishing.forceWhiteList[md5] = 1;
        currWin.location.replace(url);
      };
      let proceedBt = doc.getElementById('proceed');
      proceedBt.onclick = function() {
        if (logging) {
          CliqzUtils.telemetry({type: 'anti-phishing', action: 'click', target: 'ignore'});
          if (CliqzHumanWeb && CliqzHumanWeb.state.v[url]) {
            CliqzHumanWeb.state.v[url]['anti-phishing'] = 'ignore';
          }
        }
        CliqzAntiPhishing.forceWhiteList[md5] = 2;
        currWin.location.replace(url);
      }
    }
};

function getErrorCode(doc)
{
  var url = doc.documentURI;
  var error = url.search(/e\=/);
  var duffUrl = url.search(/\&u\=/);
  return decodeURIComponent(url.slice(error + 2, duffUrl));
}

function alert(aProgress, url, md5, logging, domWinID) {
  let currWin = aProgress.DOMWindow.top,
      doc = currWin.document;
  // checking if the FF detected also Phishing on this tab
  if (doc.documentURI.indexOf("about:blocked?") == 0 &&
      getErrorCode(doc) == "deceptiveBlocked") {
    if (logging) {
      CliqzUtils.telemetry({type: 'anti-phishing', action: 'ff_block'});
      if (CliqzHumanWeb && CliqzHumanWeb.state.v[url]) {
        CliqzHumanWeb.state.v[url]['anti-phishing'] = 'ff_block';
      }
    }
    return;
  }

  if (!CliqzAntiPhishing.isAntiPhishingActive()) {
      return;
  }

  if (md5 in CliqzAntiPhishing.forceWhiteList) {
    if (CliqzAntiPhishing.forceWhiteList[md5] == 2) {
      CliqzUtils.setTimeout(function() {
          delete CliqzAntiPhishing.forceWhiteList[md5];
      }, 1000);
    }
    return;
  }
  currWin.stop();
  aProgress.loadURI(WARNING, Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_HISTORY, null, null, null);

  CliqzUtils.setTimeout(function (currWin, url, md5){
    format(currWin, url, md5, logging, domWinID);
    let urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
    urlbar.textValue = url;
    urlbar.value = url;
    urlbar.mInputField.value = url;
  }, 150, currWin, url, md5);
};

function checkPassword(url, callback) {
  const suspicious = queryHTML(url, "input", "type,value,name").then(
    inputs => inputs.some(
      input => Object.keys(input).some(
        attr => attr === "password" || attr === "passwort"
      )
    )
  );

  if (suspicious) {
    callback(url, 'password');
  }
}

function checkSingleScript(script) {
    if (!script) {
      return;
    }

    // if someone try to get the current date
    if (script.indexOf('getTime') > -1 &&
        script.indexOf('getDay') > -1 &&
        script.indexOf('getDate') > -1)
        return true;

    // if someone try to block exiting
    if (script.indexOf('onbeforeunload') > -1)
        return true;

    if (script.indexOf('downloadEXEWithName') > -1)
        return true;
    return false;
}

function checkHTML(url, callback){
  getHTML(url).then( htmls => {
    var html = htmls[0];

    if (!html) {
      return;
    }

    if (html.indexOf('progress-bar-warning') > -1
        && html.indexOf('progress-bar-success') > -1
        || html.indexOf('play-progress') > -1
        && html.indexOf('buffer-progress') > -1) {

      callback(url, 'cheat');
      return;
    }

    if (html.indexOf('security') > -1 &&
        html.indexOf('update') > -1 &&
        html.indexOf('account') > -1) {

      callback(doc.URL, 'password');
    }
  });
}

function checkScript(url, callback) {
  const domain = url.replace('http://', '')
    .replace('https://', '').split("/")[0];

  queryHTML(url, "script", "src").then( srcs => {
    const suspicious = srcs.filter( src => src ).some( src => {
      // if the script is from the same domain, fetch it
      var dm = src.replace('http://', '').replace('https://', '').split("/")[0];

      if (dm !== domain) {
        return;
      }

      var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
      req.open('GET', src, false);
      req.send('null');

      var script = req.responseText;
      return checkSingleScript(script);
    });

    if (suspicious) {
      callback(url, 'script');
    }
  });

  queryHTML(url, "script", "innerHTML").then( scripts => {
    if (scripts.some( checkSingleScript )) {
      callback(url, 'script');
    };
  });
}

function getDomainMd5(url) {
    var domain = url.replace('http://', '').replace('https://', '').split("/")[0];
    return CliqzHumanWeb._md5(domain);
}

function getSplitDomainMd5(url) {
    var md5 = getDomainMd5(url);
    var md5Prefix = md5.substring(0, md5.length-16);
    var md5Surfix = md5.substring(16, md5.length);
    return [md5Prefix, md5Surfix];
}

function notifyHumanWeb(p) {
    var url = p.url;
    var status = p.status;
    try {
        CliqzHumanWeb.state['v'][url]['isMU'] = status;
    } catch(e) {}
}

function updateSuspiciousStatus(url, status) {
    var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
    if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList)) {
      CliqzAntiPhishing.blackWhiteList[md5Prefix] = {};
    }
    if (CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix]) {
      // don't update if the status is already set
      return;
    }
    CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix] = 'suspicious:' + status;
    if (CliqzHumanWeb) {
        var p = {'url': url, 'status': status};

        if (CliqzHumanWeb.state['v'][url]) {
            notifyHumanWeb(p);
        } else {
            CliqzUtils.setTimeout(notifyHumanWeb, 1000, p);
        }
    }
}

function updateBlackWhiteStatus(req, md5Prefix) {
    var response = req.response;
    var blacklist = JSON.parse(response).blacklist;
    var whitelist = JSON.parse(response).whitelist;
    if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList))
        CliqzAntiPhishing.blackWhiteList[md5Prefix] = {};
    for (var i = 0; i < blacklist.length; i++) {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][blacklist[i][0]] = 'black:' + blacklist[i][1];
    }
    for (var i = 0; i < whitelist.length; i++) {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][whitelist[i]] = 'white';
    }
}

function checkSuspicious(url, callback) {
  checkScript(url, callback);
  checkHTML(url, callback);
  checkPassword(url, callback);
}

function checkStatus(url, md5Prefix, md5Surfix, aProgress, hw, logging, domWinID) {
    var bw = CliqzAntiPhishing.blackWhiteList[md5Prefix];
    if (md5Surfix in bw) {  // black, white, suspicious or checking
        if (bw[md5Surfix].indexOf('black') > -1) {  // black
          if (!hw) {
            if (logging) {
              CliqzUtils.telemetry({type: 'anti-phishing', action: 'click', target: 'show_warning'});
              if (CliqzHumanWeb && CliqzHumanWeb.state.v[url]) {
                CliqzHumanWeb.state.v[url]['anti-phishing'] = 'block';
              }
            }
            // show the block html page
            // delay the actual show in case FF itself detects this as phishing also
            CliqzUtils.setTimeout(alert, 1000, aProgress, url, md5Prefix + md5Surfix, logging, domWinID);
          }
        }
    } else {
        // alert humanweb if it is suspicious
        if (hw) {
          CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix] = 'checking';
          checkSuspicious(url, updateSuspiciousStatus);
        }
    }
}

/**
 * This module injects warning message when user visits a phishing site
 * @class AntiPhishing
 * @namespace anti-phishing
 */
var CliqzAntiPhishing = {
    forceWhiteList: {},
    blackWhiteList: {},
    history: {},
    minStay: 2000,  // 2 seconds
    fallbackUrl: 'about:cliqz',
    /**
    * @method auxOnPageLoad
    * @param url {string}
    */
    onHwActiveURL: function(msg) {
      const url = msg.activeURL;
      checkSuspicious(url, updateSuspiciousStatus);
    },
    auxOnPageLoad: function(url, aProgress, hw, logging, domWinID) {
        if (url.startsWith('about:') || url.startsWith('chrome:')) {
          return;
        }
        var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
        if (md5Prefix in CliqzAntiPhishing.blackWhiteList)
            checkStatus(url, md5Prefix, md5Surfix, aProgress, hw, logging, domWinID);
        else
            CliqzUtils.httpGet(
                BW_URL + md5Prefix,
                function success(req) {
                    updateBlackWhiteStatus(req, md5Prefix);
                    checkStatus(url, md5Prefix, md5Surfix, aProgress, hw, logging, domWinID);
                },
                function onerror() {
                },
                3000
            );
    },
    /**
    * @method getDomainStatus
    * @param url {string}
    */
    getDomainStatus: function(url) {
        var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
        if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList) ||
            !(md5Surfix in CliqzAntiPhishing.blackWhiteList[md5Prefix]))
            return [null, null];
        var status = CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix];
        if (status == 'white')
            return [status, null];
        else {
            var statusItems = status.split(':');
            if (statusItems.length == 2)
                return statusItems;
            else
                return [null, null];
        }
    },
    isAntiPhishingActive: function() {
        return CliqzUtils.getPref('cliqz-anti-phishing-enabled', false);
    },
    addPageLoad(domWinID, url, ts) {
      if (!CliqzUtils.getWindow().gBrowser.getBrowserForOuterWindowID) {
        return;
      }
      if (!(domWinID in CliqzAntiPhishing.history)) {
        CliqzAntiPhishing.history[domWinID] = [{url, ts}];
      } else {
        CliqzAntiPhishing.history[domWinID].push({url, ts});
        let i = CliqzAntiPhishing.history[domWinID].length - 1;
        while (i > 0) {
          if (CliqzAntiPhishing.history[domWinID][i].ts - CliqzAntiPhishing.history[domWinID][i-1].ts > CliqzAntiPhishing.minStay) {
            CliqzAntiPhishing.history[domWinID] = CliqzAntiPhishing.history[domWinID].slice(i-1);
            break;
          }
          i--;
        }
      }
      // clear closed tabs
      Object.keys(CliqzAntiPhishing.history).forEach(domWinID => {
        if (CliqzUtils.getWindow().gBrowser.getBrowserForOuterWindowID &&
        !CliqzUtils.getWindow().gBrowser.getBrowserForOuterWindowID(parseInt(domWinID))) {
          delete CliqzAntiPhishing.history[domWinID];
        }
      });
    },
    getValidUrl(domWinID) {
      const ts = Date.now();
      if (!(domWinID in CliqzAntiPhishing.history) || CliqzAntiPhishing.history[domWinID].length <= 1) {
        return CliqzAntiPhishing.fallbackUrl;
      }
      if (CliqzAntiPhishing.history[domWinID][1].ts - CliqzAntiPhishing.history[domWinID][0].ts > CliqzAntiPhishing.minStay) {
        return CliqzAntiPhishing.history[domWinID][0].url;
      }
      return CliqzAntiPhishing.fallbackUrl;
    },
    listener: {
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
        onLocationChange: function(aProgress, aRequest, aURI) {

          let logging = true;
          let domWinID = aProgress.DOMWindowID;
          if (aRequest && aRequest.isChannelPrivate !== undefined && aRequest.isChannelPrivate) {
            logging = false;
          } else {
            // keep a history so we know where to go back to so we don't fall
            // into a blackhole of redirect chains
            CliqzAntiPhishing.addPageLoad(domWinID, aURI.spec, Date.now());
          }
          CliqzAntiPhishing.auxOnPageLoad(aURI.spec, aProgress, false, logging, domWinID);
        }
    }
};

export default CliqzAntiPhishing;
