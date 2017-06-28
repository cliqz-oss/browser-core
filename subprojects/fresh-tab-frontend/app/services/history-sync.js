import Ember from 'ember';

export default Ember.Service.extend({
  cliqz: Ember.inject.service(),
  store: Ember.inject.service(),

  limit: 100,
  latestFrameStartsAt: Infinity,

  setup: function () {
    this.set('isRunning', false);
    this.set('urlsToDelete', []);
  }.on('init'),

  stop() {
    this.set('isRunning', false);
  },

  start() {
    const startAt = Date.now() * 1000;
    const more = function (frameStartsAt) {
      const endsAt = Date.now() * 1000;
      this.fetch({
        frameStartsAt: frameStartsAt + 1,
        frameEndsAt: endsAt,
      }).then(() => {
        if (this.get('isRunning')) {
          Ember.run.later(null, more, endsAt, 1000);
        }
      });
    }.bind(this);

    this.set('isRunning', true);

    return this.fetch({
      limit: this.get('limit'),
      frameEndsAt: startAt,
    }).then(
      ({history}) => Ember.run.later(null, more, history.frameEndsAt, 1000)
    );
  },

  loadMore({ domain, since } = {}) {
    const params = {
      limit: this.get('limit'),
      frameEndsAt: this.get('latestFrameStartsAt'),
    };

    if (since) {
      params.since = Number(since) * 1000;
    }

    if (domain) {
      params.domain = domain;
    }

    return this.fetch(params);
  },

  updateLatestFrameStartsAt(history) {
    const latestFrameStartsAt = this.get("latestFrameStartsAt");

    if (history.frameStartsAt < latestFrameStartsAt) {
      this.set("latestFrameStartsAt", history.frameStartsAt);
    }
  },

  updateConcactsAndMessages(history) {
    const records = Object.keys(history.domains)
      .filter(domain => !!domain)
      .map(domain => {
        const contact = history.domains[domain];
        const messages = contact.visits.map(message => {
          return {
            id: message.lastVisitedAt,
            type: "history-message",
            attributes: {
              url: message.url,
              title: message.title,
              query: message.query,
              meta: message.meta,
              lastVisitedAt: new Date(message.lastVisitedAt / 1000),
            },
            relationships: {
              contact: {
                data: {
                  id: domain,
                  type: "history-contact",
                }
              }
            }
          }
        });

        const articles = (contact.news || []).map( article => {
          return {
            id: article.url,
            type: 'cliqz-article',
            attributes: {
              publishedAt: new Date(article.cd * 1000),
              title: article.title,
              description: article.description,
              imageUrl: article.media,
              score: article.score,
              url: article.url,
              isRead: false
            },
            relationships: {
              contact: {
                data: {
                  id: domain,
                  type: "history-contact",
                }
              }
            }
          }
        });

        return [
          ...articles,
          ...messages,
          {
            id: domain,
            type: "history-contact",
            attributes: {
              domain,
              logo: contact.logo,
              lastVisitedAt: new Date(contact.lastVisitedAt / 1000),
              snippet: contact.snippet
            },
          }
        ];
      })
      .reduce((flattened, list) => flattened.concat(list), []);

    this.get('store').push({
      data: records
    });
  },

  updateTabsInfo(history) {
    const store = this.get('store');

    // clear tab status
    store.peekAll("history-contact").forEach(
      contact => contact.setProperties({
        isCurrent: false,
        isActive: false,
      })
    );
    store.peekAll("history-message").forEach(
      message => message.setProperties({
        isCurrent: false,
        isActive: false,
        tabIndex: null,
      })
    );

    // mark active tabs
    Object.keys(history.tabs || {}).forEach( domain => {
      /*
      const contact = store.peekRecord("history-contact", domain);

      if (!contact) {
        return;
      }

      contact.setProperties({
        isActive: true
      });
      */

      Object.keys(history.tabs[domain] || {}).forEach( url => {
        const message = history.tabs[domain][url];
        const messageRecord = store.peekAll("history-message").find(
          m => m.get('url') === url);

        if (message.isCurrent) {
        //  contact.set("isCurrent", true);
        }

        if (messageRecord) {
          messageRecord.setProperties({
            tabIndex: message.index,
            isActive: true,
            isCurrent: !!message.isCurrent,
          });
        }
      });
    });
  },

  updateSessions(history) {
    const store = this.get('store');
    const visits = Object.keys(history.domains)
      .map(domain => history.domains[domain].visits)
      .reduce((all, urls) => all.concat(urls), []);
    const sessions = [];

    visits.uniqBy('lastVisitedAt').forEach(visit => {
      const message = store.peekRecord('history-message', visit.lastVisitedAt);

      // FIXME: fails for file:// urls
      if (!message) {
        return;
      }

      let session = store.peekRecord('session', visit.sessionId);

      if (!session) {
        session = store.createRecord('session', {
          id: visit.sessionId,
        });
      }

      session.get('visits').pushObject(message);
      sessions.pushObject(session);
    });

    return sessions.uniqBy('id');
  },

  fetch(params) {
    return this.get('cliqz').getHistory(params).then(history => {
      this.updateLatestFrameStartsAt(history);
      this.updateConcactsAndMessages(history);
      // this.updateTabsInfo(history);
      const sessions = this.updateSessions(history);
      return {
        sessions,
        history,
      };
    });
  },

  search(query, from, to) {
    const params = {
      query,
      frameEndsAt: to,
      frameStartsAt: from,
      limit: 50,
      page: 1,
    };
    return this.fetch(params);
  },

  updateHistoryUrls(deletedUrls) {
    const store = this.get('store');
    const visits = store.peekAll('history-message');
    const urlsToDelete = this.get('urlsToDelete');
    const urls = [];
    deletedUrls.forEach(deletedUrl => {
      if (urlsToDelete.includes(deletedUrl)) {
        urlsToDelete.removeObject(deletedUrl);
      } else {
        urls.push(deletedUrl);
      }
    });
    visits.toArray().forEach(visit => {
      if(urls.indexOf(visit.get('url')) >= 0) {
        const isLastChild = visit.get('session.visits.length') === 1;
        const sessionId = visit.get('session.id');
        visit.unloadRecord();
        if(isLastChild) {
          const session = store.peekRecord('session', sessionId);
          session.unloadRecord();
        }
      }
    });
    this.set('urlsToDelete', []);
  },

  deleteVisit(visitId) {
    const store = this.get('store');
    const cliqz = this.get('cliqz');
    const visit = store.peekRecord('history-message', visitId);
    const session = visit.get('session.content');
    this.get('urlsToDelete').addObject(visit.get('url'));
    visit.unloadRecord();
    if (session.get('visits.length') === 0) {
      session.unloadRecord();
    }
    cliqz.sendTelemetry({
      type: 'history',
      view: 'sections',
      action: 'click',
      target: 'delete_site'
    });
    cliqz.deleteVisit(visitId);
  },

  deleteSession(sessionId) {
    const store = this.get('store');
    const cliqz = this.get('cliqz');
    const session = store.peekRecord('session', sessionId);
    const visitIds = session.get('visits').mapBy('id');
    const visitUrls = session.get('visits').mapBy('url');
    this.get('urlsToDelete').addObjects(visitUrls);
    session.unloadRecord();
    cliqz.sendTelemetry({
      type: 'history',
      view: 'sections',
      action: 'click',
      target: 'delete_section'
    });
    cliqz.deleteVisits(visitIds);
  },

  sendUserFeedback(data) {
    const cliqz = this.get('cliqz');
    cliqz.sendUserFeedback(data);
  }
});
