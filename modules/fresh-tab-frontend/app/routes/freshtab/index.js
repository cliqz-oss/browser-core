import Ember from "ember";
import News from "../../models/news";
import SpeedDials from "../../models/speed-dials";

var displayTotalTime = 0,
    start = 0;

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  model() {
    return this.get('cliqz').getSpeedDials().then( speedDials => {
      return Ember.Object.create({
        speedDials: SpeedDials.create({ content: speedDials }),
        news: News.create({ model: [] })
      });
    })

  },

  afterModel(model) {

    this.get('cliqz').getNews().then( news => {
      model.set('news.model', news);
      var historySites = model.getWithDefault("speedDials.history.length", 0) < 5 ? model.get("speedDials.history.length") : 5,
          customSites = model.getWithDefault("speedDials.custom.length", 0),
          self = this;


      this.get('cliqz').getTabIndex().then(function(tabIndex){
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'display',
          historysites: historySites,
          customsites: customSites,
          topnews: model.getWithDefault("news.topNews.length", 0),
          topnews_version: model.get("news.version"),
          yournews: model.getWithDefault("news.yourNews.length", 0),
          tab_index: tabIndex
        });

        start = new Date().getTime();


        window.addEventListener("beforeunload", function() {
          displayTotalTime = new Date().getTime() - start;
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'hide',
            display_time: displayTotalTime,
            home_id: tabIndex
          });
        }.bind(this), false);

      }.bind(this));
    });
  }
});
