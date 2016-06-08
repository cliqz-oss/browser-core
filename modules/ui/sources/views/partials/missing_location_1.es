import { utils } from "core/cliqz";

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
      CLIQZEnvironment.setLocationPermission(this.window, "yes");
      this.loadLocalResults(ev.target);
      CliqzUtils.telemetry({
        type: 'setting',
        setting: "location-setting-dropdown",
        value: "share-location-yes"
      });
    },
    "cqz_location_once": function(ev) {
      ev.preventDefault();
      this.loadLocalResults(ev.target);
      CliqzUtils.telemetry({
        type: 'setting',
        setting: "location-setting-dropdown",
        value: "share-location-once-step-" + ev.target.getAttribute("location_dialogue_step")
      });
    },
    "cqz_location_no": function(ev) {
      var container = this.CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container"),
          el = ev.target,
          localType = el.getAttribute("local_sc_type") || "default";

      container.innerHTML = this.CliqzHandlebars.tplCache["partials/missing_location_2"]({
          friendly_url: el.getAttribute("bm_url"),
          trans_str: messages[localType].trans_str
      });
      CliqzUtils.telemetry({
        type: 'setting',
        setting: "location-setting-dropdown",
        value: "share-location-no"
      });
    },
    "cqz_location_never": function(ev) {
      CLIQZEnvironment.setLocationPermission(this.window, "no");
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
      CLIQZEnvironment.setLocationPermission(this.window, "yes");
      var container = this.CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
      if (container) container.innerHTML = this.CliqzHandlebars.tplCache["partials/no-locale-data"]({
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
    this.CliqzHandlebars = this.window.CliqzHandlebars;
    Object.keys(events.click).forEach( selector => {
      this.events.click[selector] = events.click[selector].bind(this);
    })
  }

  loadLocalResults(el) {
    this.CLIQZ.Core.popup.cliqzBox.querySelector(".location_permission_prompt").classList.add("loading");
    CLIQZEnvironment.getGeo(true, (loc) => {
        CliqzUtils.httpGet(CliqzUtils.RICH_HEADER +
            "&q=" + this.CLIQZ.Core.urlbar.value +
            CliqzUtils.encodeLocation(true, loc.lat, loc.lng) +
            "&bmresult=" + el.getAttribute("bm_url"),
            this.handleNewLocalResults(el));
    }, () => {
        this.failedToLoadResults(el);
        CliqzUtils.log("Unable to get user's location", "CliqzUtils.getGeo");
    });
  }

  handleNewLocalResults(el) {
    return (req) => {
      //CliqzUtils.log(req, "RESPONSE FROM RH");
      var resp,
          container = el,
          r;

      try {
        resp = JSON.parse(req.response);
        CliqzUtils.log(resp, "RH RESPONSE");
      } catch (ex) {
      }
      if (resp && resp.results && resp.results.length > 0) {
        while (container && !CliqzUtils.hasClass(container, "cqz-result-box")) {
          container = container.parentElement;
          if (!container || container.id == "cliqz-results") return;
        }
        this.CLIQZ.UI.enhanceResults(resp);
        r = resp.results[0];
        if (container) container.innerHTML = this.CliqzHandlebars.tplCache[r.data.template](r);
      } else {
        this.failedToLoadResults(el);
      }
    };
  }

  failedToLoadResults(el) {
    var container = this.CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
    if (el.id === "cqz_location_yes") {
        container.innerHTML = this.CliqzHandlebars.tplCache["partials/no-locale-data"]({
          "display_msg": "location-sorry"
        });
    } else if (el.id == "cqz_location_once") {
        container.innerHTML = this.CliqzHandlebars.tplCache["partials/no-locale-data"]({
          "display_msg": "location-permission-ask"
        });
    }
  }

  displayMessageForNoPermission() {
    var container = this.CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
    if (container) container.innerHTML = this.CliqzHandlebars.tplCache["partials/no-locale-data"]({
      "display_msg": "location-no"
    });
  }
};
