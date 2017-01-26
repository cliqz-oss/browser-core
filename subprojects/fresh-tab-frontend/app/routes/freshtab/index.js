import Ember from "ember";

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
  cliqz: Ember.inject.service(),
  notifications: Ember.inject.service(),

  activate() {
    this.get('notifications').start();
    Ember.$('body').addClass('freshTabContainer');
  },

  deactivate() {
    this.get('notifications').stop();
    Ember.$('body').removeClass('freshTabContainer');
  },

  model() {
    return this.get('cliqz').getSpeedDials().then(speedDials => {
      const allDials = speedDials.history.concat(speedDials.custom);
      this.store.push({
        data: allDials.map(dial => {
          return {
            id: dial.id,
            type: 'speed-dial',
            attributes: Object.assign({
              type: dial.custom ? 'custom' : 'history',
            }, dial),
          };
        })
      });

      return Ember.Object.create({
        speedDials: {
          history: this.store.peekAll('speed-dial').filterBy('type', 'history').toArray(),
          custom: this.store.peekAll('speed-dial').filterBy('type', 'custom').toArray(),
        },
        news: Ember.ArrayProxy.create()
      });
    })

  },

  afterModel(model) {
    start = new Date().getTime();
    focusStart = start;

    const news = this.get('cliqz').getNews().then( news => {
      model.get('news').setProperties({
        version: news.version,
        content: news.news.map(article => Ember.Object.create(article)),
      });

      return news;
    });

    Ember.RSVP.hash({
      news,
      notificationsReady: this.get("notifications").waitForFirstFetch(),
      tabIndex: this.get('cliqz').getTabIndex(),
    }).then(({tabIndex, news}) => {
      let historySites = model.getWithDefault("speedDials.history.length", 0);
      if (historySites > 5) {
        historySites = 5;
      }
      const customSites = model.getWithDefault("speedDials.custom.length", 0);
      const speedDials = model.get('speedDials');
      const visibleDials = speedDials.history.slice(0,4).concat(speedDials.custom);
      const notificationCount = visibleDials.filterBy('notificationStatus', 'enabled').reduce(sum => sum + 1, 0);
      const newNotificationCount = visibleDials.filterBy('hasNewNotifications', true).reduce(sum => sum + 1, 0);
      const telemetry = {
        type: 'home',
        action: 'display',
        historysites: historySites,
        customsites: customSites,
        topnews_version: news.version,
        tab_index: tabIndex,
        notifications: notificationCount,
        new_notifications: newNotificationCount,
      };

      const newsTypes = news.news.reduce((hash, curr) => {
        hash[curr.type] = hash[curr.type] || 0;
        hash[curr.type] += 1;
        return hash;
      }, {});

      Object.assign(telemetry, newsTypes)
      this.get('cliqz').sendTelemetry(telemetry);

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
    });
  }
});
