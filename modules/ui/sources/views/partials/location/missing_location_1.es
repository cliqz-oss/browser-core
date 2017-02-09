import { utils } from "core/cliqz";
import CliqzHandlebars from "core/templates";
import autocomplete from "autocomplete/autocomplete";

var messages = {
  "movies": {
    'trans_str': {
      'message': 'movies_confirm_no',
      'yes': 'yes',
      'no': 'show_local_movies'
    }
  },
  "cinemas": {
    'trans_str': {
      'message': 'cinemas_confirm_no',
      'yes': 'yes',
      'no': 'show_local_cinemas'
    }
  },
  "default": {
    'trans_str': {
      'message': 'location_confirm_no',
      'yes': 'yes',
      'no': 'show_local_results'
    }
  }
};

var events = {
  click: {
    "cqz_location_yes": function(ev) {
      ev.preventDefault();
      CliqzUtils.callAction(
        "geolocation",
        "setLocationPermission",
        ["yes"]
      );
      this.loadLocalResults(ev.target);
      CliqzUtils.telemetry({
        type: 'setting',
        setting: "location-setting-dropdown",
        value: "share-location-yes"
      });
    },
    "cqz_location_once": function(ev) {
      ev.preventDefault();
      CliqzUtils.SHARE_LOCATION_ONCE = true;
      this.loadLocalResults(ev.target);
      CliqzUtils.telemetry({
        type: 'setting',
        setting: "location-setting-dropdown",
        value: "share-location-once-step-" + ev.target.getAttribute("location_dialogue_step")
      });
    },
    "cqz_location_no": function(ev) {
      var container = this.CLIQZ.UI.gCliqzBox.querySelector(".local-sc-data-container"),
          el = ev.target,
          localType = el.getAttribute("local_sc_type") || "default";

      container.innerHTML = CliqzHandlebars.tplCache["partials/location/missing_location_2"]({
          url: el.getAttribute("bm_url"),
          trans_str: messages[localType].trans_str
      });
      CliqzUtils.telemetry({
        type: 'setting',
        setting: "location-setting-dropdown",
        value: "share-location-no"
      });
    },
    "cqz_location_never": function(ev) {
      CliqzUtils.callAction(
        "geolocation",
        "setLocationPermission",
        ["no"]
      );
      this.displayMessageForNoPermission();
      CliqzUtils.telemetry({
        type: 'setting',
        setting: "location-setting-dropdown",
        value: "share-location-never"
      });
    },
    "cqz_location_not_now": function(ev) {
      this.displayMessageForNoPermission();
    },
    "cqz_location_yes_confirm": function(ev) {
      CliqzUtils.callAction(
        "geolocation",
        "setLocationPermission",
        ["yes"]
      );
      var container = this.CLIQZ.UI.gCliqzBox.querySelector(".local-sc-data-container");
      if (container) container.innerHTML = CliqzHandlebars.tplCache["partials/location/no-locale-data"]({
        "display_msg": "location-thank-you"
      });
    }
  }
};

export default class {
  constructor(win) {
    this.window = win;
    this.CLIQZ = win.CLIQZ;
    this.events = { click: {} };
    Object.keys(events.click).forEach( selector => {
      this.events.click[selector] = events.click[selector].bind(this);
    })
  }

  loadLocalResults(el) {
    this.CLIQZ.UI.gCliqzBox.querySelector(".location_permission_prompt").classList.add("loading");
    CliqzUtils.callAction("geolocation", "updateGeoLocation", []).then(loc => {
      if(loc.latitude && loc.longitude){
        var query = autocomplete.lastResult._searchString,
            localResult = autocomplete.lastResult._results[0],
            url = CliqzUtils.RICH_HEADER + CliqzUtils.getRichHeaderQueryString(
              query,
              loc
            ),
            data = {
              q: query,
              results: [
                {
                  url: localResult.val,
                  snippet: {
                    title: localResult.data.title,
                    description: localResult.data.description
                  }
                }
              ]
            };
        CliqzUtils.httpPut(url, this.handleNewLocalResults(el, this.CLIQZ.UI.gCliqzBox, query), JSON.stringify(data));

      } else {
        CliqzUtils.log("Unable to get user's location", "getlocation.actions.updateGeoLocation");
        this.failedToLoadResults(el);
      }
    }).catch(() => {
        CliqzUtils.log("Unable to get user's location", "getlocation.actions.updateGeoLocation");
        this.failedToLoadResults(el);
    });
  }

  handleNewLocalResults(el, box, q) {
    return (req) => {
      var resp,
          container = el,
          r;

      try {
        resp = JSON.parse(req.response);
      } catch (ex) {
        this.failedToLoadResults(el);
        return;
      }
      if (resp && resp.results && resp.results.length > 0) {
        while (container && !container.classList.contains("cqz-result-box")) {
          container = container.parentElement;
          if (!container || container.id == "cliqz-results") return;
        }
        resp = this.CLIQZ.UI.enhanceResults(resp);
        r = resp.results[0];
        // r.type === 'cliqz-extra' checks if the RH enhanced this result, or if it returned
        // back the same snippet that it received (no local data)
        if (r.type === 'cliqz-extra' && container) {
          container.innerHTML = CliqzHandlebars.tplCache[r.template || 'generic'](r);

          //we need to make the title arrowable for keyboard navigation
          var targetTitle = container.querySelector('.cqz-result-title');
          if(targetTitle){
            targetTitle.setAttribute('url', r.url);
            targetTitle.setAttribute('arrow', 'true');
          }
        } else {
          this.failedToLoadResults(el);
        }
        CliqzUtils.onRenderComplete(q, box);
      } else {
        this.failedToLoadResults(el);
      }
    };
  }

  failedToLoadResults(el) {
    var container = this.CLIQZ.UI.gCliqzBox.querySelector(".local-sc-data-container");
    if (el.id === "cqz_location_yes") {
        container.innerHTML = CliqzHandlebars.tplCache["partials/location/no-locale-data"]({
          "display_msg": "location-sorry"
        });
    } else if (el.id == "cqz_location_once") {
        container.innerHTML = CliqzHandlebars.tplCache["partials/location/no-locale-data"]({
          "display_msg": "location-sorry"
        });
    }
  }

  displayMessageForNoPermission() {
    var container = this.CLIQZ.UI.gCliqzBox.querySelector(".local-sc-data-container");
    if (container) container.innerHTML = CliqzHandlebars.tplCache["partials/location/no-locale-data"]({
      "display_msg": "location-no"
    });
  }
};
