import Ember from 'ember';

export default Ember.Service.extend({
  cliqz: Ember.inject.service(),
  store: Ember.inject.service(),

  limit: 100,
  latestFrameStartsAt: Infinity,

  start() {
    const startAt = Date.now() * 1000;
    const fetch = this.fetch.bind(this);

    function more(frameStartsAt) {
      fetch({
        frameStartsAt: frameStartsAt + 1,
        frameEndsAt: Date.now() * 1000,
      }).then(
        history => Ember.run.later({}, more, history.frameEndsAt || startAt, 1000)
      );
    }

    return this.fetch({
      limit: this.get('limit'),
      frameEndsAt: startAt,
    }).then(
      history => Ember.run.later({}, more, history.frameEndsAt, 1000)
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

  fetch(params) {
    var store = this.get('store');

    return this.get('cliqz').getHistory(params).then(history => {
      const latestFrameStartsAt = this.get("latestFrameStartsAt");

      if (history.frameStartsAt < latestFrameStartsAt) {
        this.set("latestFrameStartsAt", history.frameStartsAt);
      }

      store.push({
        data: Object.keys(history.domains).map( domain => {
          const contact = history.domains[domain];
          const messages = Object.keys(contact.urls).map( url => {
            const message = contact.urls[url];
            return {
              id: url,
              type: "history-message",
              attributes: {
                url,
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
        }).reduce( (flattened, list) => flattened.concat(list), [])
      });

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
      Object.keys(history.tabs).forEach( domain => {
        const contact = store.peekRecord("history-contact", domain);

        if (!contact) {
          return;
        }

        contact.setProperties({
          isActive: true
        });

        Object.keys(history.tabs[domain]).forEach( url => {
          const message = history.tabs[domain][url];
          const messageRecord = store.peekRecord("history-message", url);
          if (message.isCurrent) {
            contact.set("isCurrent", true);
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

      return history;
    });
  }
});
