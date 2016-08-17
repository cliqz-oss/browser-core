import Ember from "ember";
import SpeedDials from "../../models/speed-dials";

var focusTotalTime = 0,
    displayTotalTime = 0,
    start = 0,
    focusStart,
    blurStart = 0,
    focusTime = 0,
    blurCount = 0,
    unloadingStarted = false,
    focus = true;

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  activate() {
    Ember.$('body').addClass('freshTabContainer');
  },

  deactivate() {
    Ember.$('body').removeClass('freshTabContainer');
  },

  model() {
    return this.get('cliqz').getSpeedDials().then( speedDials => {
      return Ember.Object.create({
        speedDials: {
          history: speedDials.history.map(dial => Ember.Object.create(dial)),
          custom: speedDials.custom.map(dial => Ember.Object.create(dial)),
        },
        news: Ember.ArrayProxy.create()
      });
    })

  },

  afterModel(model) {

    this.get('cliqz').getNews().then( news => {
      model.get('news').setProperties({
        version: news.version,
        content: news.news.map(article => Ember.Object.create(article)),
      });

      var historySites = model.getWithDefault("speedDials.history.length", 0) < 5 ? model.get("speedDials.history.length") : 5,
          customSites = model.getWithDefault("speedDials.custom.length", 0),
          self = this;

      this.get('cliqz').getTabIndex().then(function(tabIndex){
        const telemetry = {
          type: 'home',
          action: 'display',
          historysites: historySites,
          customsites: customSites,
          topnews_version: news.version,
          tab_index: tabIndex
        };

        const newsTypes = news.news.reduce((hash, curr) => {
          hash[curr.type] = hash[curr.type] || 0;
          hash[curr.type] += 1;
          return hash;
        }, {});

        Object.assign(telemetry, newsTypes)
        this.get('cliqz').sendTelemetry(telemetry);

        start = new Date().getTime();
        focusStart = start;


        window.addEventListener("beforeunload", function() {
          if (unloadingStarted) {
            return;
          } else {
            unloadingStarted = true;
          }
          displayTotalTime = new Date().getTime() - start;
          focusTotalTime += new Date().getTime() - focusStart;
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'hide',
            display_time: displayTotalTime,
            focus_time: focusTotalTime,
            blur_count: blurCount,
            home_id: tabIndex
          });
        }.bind(this), false);

        window.addEventListener('blur', function() {
          focus = false;
          blurStart = new Date().getTime();
          focusTotalTime += blurStart - focusStart;
          focusTime = blurStart - focusStart;
          blurCount++;
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'blur',
            focus_time: focusTime,
            home_id: tabIndex
          });
        }.bind(this));

        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'focus',
          home_id: tabIndex
        });

        window.addEventListener('focus', function() {
          if (focus) {
            return;
          }
          focusStart = new Date().getTime();
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'focus',
            home_id: tabIndex
          });
        }.bind(this));

      }.bind(this));
    });
  }
});
