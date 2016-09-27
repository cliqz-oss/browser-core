var attPopUp = document.querySelector(".cqz-antitracking-popup"),
    enableButton = document.querySelector("#cqz-antrc-power-btn"),
    whitelistButton = document.querySelector("#cqz-whitelist-btn"),
    privacyScore = document.querySelector(".cqz-dog-score-holder"),
    privacyScoreLink = document.querySelector(".cqz-watchdog-score a"),
    trackersListElement = document.querySelector(".cqz-trackers-blocked"),
    stylesLoader = document.querySelector("#styles"),
    hostname;
new Date;

//Refresh the CSS of popup
// !!!!!!!!!!!!!!!!!!!!!  DEV ONLY  !!!!!!!!!!!!!!!!!!!!!!!!
//stylesLoader.setAttribute("href", stylesLoader.getAttribute("href") + "?" + Math.floor(Date.now() /1000));
// !!!!!!!!!!!!!!!!!!!!!  Comment Me PLEASE  !!!!!!!!!!!!!!!!!!!!!!!!


var trackersListTemplate = Handlebars.compile(document.querySelector("#trackersListTemplate").innerHTML);

Handlebars.registerHelper('nameCleaner', function(name) {
  return name.replace(/ /g,"-");
});

function setBodyClass(options) {
  if (options.enabled) {
    document.body.classList.add("cqz-attrack-enabled");
    document.body.classList.remove("cqz-attrack-disabled");
  } else {
    document.body.classList.add("cqz-attrack-disabled");
    document.body.classList.remove("cqz-attrack-enabled");
  }

  if (options.whitelisted) {
    document.body.classList.add("cqz-domain-in-whitelist");
    // Switch is on if the Domain is not in white list.
    whitelistButton.classList.remove("cqz-switch-state-on");
  } else {
    document.body.classList.remove("cqz-domain-in-whitelist");
    whitelistButton.classList.add("cqz-switch-state-on");
  }

  // If ATT enabled and there is no site
  if (!options.url && options.enabled) {
    document.body.classList.add("cqz-no-site");
  } else {
    document.body.classList.remove("cqz-no-site");
  }

  //If thare are ANY tracker
  if (!options.have_trackers || (options.have_trackers && !options.have_bad_trackers)) {
    document.body.classList.add("cqz-have-no-trackers");
  } else {
    document.body.classList.remove("cqz-have-no-trackers");
  }

  //If thare are BAD tracker
  if (options.have_bad_trackers) {
    document.body.classList.add("cqz-have-bad-trackers");
  } else {
    document.body.classList.remove("cqz-have-bad-trackers");
  }

  // Turn on - off fix
  if( options.reload ) {
    document.body.classList.add("cqz-att-reload");
  } else {
    document.body.classList.remove("cqz-att-reload");
  }
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
    var elArgs = el.dataset.i18n.split(","),
        key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);
  });
}

function populateDOM() {
  chrome.runtime.sendMessage({ functionName: "getPopupData" }, function (data) {
    hostname = data.url;

    var general_msg_trnsl = document.querySelector(".cqz-general-trackers-msg");
    var general_trackers_count = data.cookiesCount + data.requestsCount;
    var have_bad_trackers_bool = general_trackers_count > 0;
    var have_any_trackers_bool = Object.keys(data.trakersList.trackers).length > 0 || 0;

    // Whatch Dog SCORE and LINK
    if(data.ps && data.ps.score ) {
      if(data.ps.score >= 0 ) {
        var wdScore = Math.round(data.ps.score / 20);
        privacyScore.classList.add("cqz-score-" + wdScore);
        privacyScoreLink.setAttribute("data-href",privacyScoreLink.getAttribute("data-href") + hostname);
      } else {
        document.querySelector(".cqz-watchdog-score").style = "display: none;";
      }
    }

    //Display Trackers list
    var counterTrackers = 0;

    // Check if we have trackers && if domain is not whitelisted
    if(have_bad_trackers_bool > 0 && data.trakersList && data.trakersList.trackers && !data.isWhitelisted) {
      //Populate Tracking List
      var companies = [];


      // aggregate data by company
      for (var company in data.trakersList.companies) {
        var companyTrackers = data.trakersList.companies[company];
        var trackerCount = companyTrackers .reduce( function (sum, domain) {
          var domainData = data.trakersList.trackers[domain];
          return sum + (domainData.cookie_blocked || 0) + (domainData.bad_qs || 0)
        }, 0);

        //Get the Bad Trackers
        var companyBadTracker = companyTrackers.map(function(trackerName) {
          return {
            name: trackerName,
            domain_name: CliqzUtils.getDetailsFromUrl(trackerName).domain,
            count: data.trakersList.trackers[trackerName].bad_qs + data.trakersList.trackers[trackerName].cookie_blocked
          };
        });
        // sort by count
        companyBadTracker.sort(function (a, b) {
          return b.count - a.count;
        });

        companies.push({name: company, count: trackerCount, trackers: companyBadTracker, watchDogName: company.replace(/ /g,"-")});
      };


      // sort companies by tracking
      counterTrackers = companies.length;
      companies.sort( function (a, b) {
        return b.count - a.count;
      });

      // create html company list
      trackersListElement.innerHTML = trackersListTemplate(companies);


      trackersListElement.addEventListener('click', function (e) {
        var el = closest(e.target, ".cqz-company-holder");
        if(e) {
          //el.parentElement.classList.toggle('active');
        }
      });

      expandPopUp('big');
    } else {
      expandPopUp('small');
    }

    document.querySelector(".cqz-count").textContent = general_trackers_count;

    var whiteListOn = document.querySelector(".cqz-whitelisted-msg");
    var domainName = document.querySelector(".cqz-domain-name");

    domainName.textContent = data.url;
    if (data.url.length > 24) {
      domainName.classList.add('cqz-size-small')
    }

    whiteListOn.dataset.i18n = [
      whiteListOn.dataset.i18n,
      data.url,
    ].join(',');

    setBodyClass({
      enabled: data.enabled,
      whitelisted: data.isWhitelisted,
      url: data.url,
      reload: data.reload,
      have_bad_trackers: have_bad_trackers_bool,
      have_trackers: have_any_trackers_bool
    });


    localizeDocument();
  });
}

enableButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleAttrack" }, populateDOM);
}, false);

whitelistButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleWhiteList", args: {hostname: hostname} }, populateDOM);
}, false);

function expandPopUp (command) {
  var height;

  if(command == 'small') {
    attPopUp.classList.add('cqz-small-popup');
    attPopUp.classList.remove('cqz-big-popup');
  }

  if(command == 'big') {
    attPopUp.classList.remove('cqz-small-popup');
    attPopUp.classList.add('cqz-big-popup');
  }

  height = attPopUp.classList.contains('cqz-big-popup') ? 420 : 240;

  chrome.runtime.sendMessage({
    functionName: "updateHeight",
    args: [ height]
  }, function () {});
}

populateDOM();

chrome.runtime.sendMessage({ functionName: "telemetry", args: { action: "click", target: "popup", includeUnsafeCount: true } });

function closest(elem, selector) {
  while (elem) {
    if (matches(elem, selector)) {
      return elem;
    } else {
      elem = elem.parentElement;
    }
  }
  return false;
}

// returns true if the selector matches the element
function matches(elem, selector) {
    var f = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;
    if(f){
        return f.bind(elem)(selector);
    }
    else {
        //older FF doest have mathes - create our own
        return elem.parentNode && Array.prototype.indexOf.call(elem.parentNode.querySelectorAll(selector), elem) != -1;
    }
}
