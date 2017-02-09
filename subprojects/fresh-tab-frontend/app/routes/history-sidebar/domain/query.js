import Ember from "ember";

export default Ember.Route.extend({
  cliqz: Ember.inject.service(),

  activate() {
    const domainRoute = this.modelFor("history-sidebar.domain");
    if (domainRoute) {
      domainRoute.set("hideHeader", true);
    }
  },

  deactivate() {
    const domainRoute = this.modelFor("history-sidebar.domain");
    if (domainRoute) {
      domainRoute.set("hideHeader", false);
    }
  },

  model(params) {
    return this.get("cliqz").getQuery(params.query).then( results => {
      results.forEach( result => {
        const record = this.store.peekRecord("history-message", result.lastVisitedAt);
        if (record) {
          return;
        }

        this.store.push({
          data: {
            id: result.lastVisitedAt,
            type: "history-message",
            attributes: {
              url: result.url,
              query: result.query,
              meta: result.meta,
              lastVisitedAt: new Date(result.lastVisitedAt / 1000),
            },
            relationships: {
              contact: {
                data: {
                  id: result.domain,
                  type: "history-contact",
                }
              }
            }
          }
        });
      });

      return {
        query: params.query,
        messages: results.map( result => {
          return this.store.peekRecord("history-message", result.lastVisitedAt);
        })
      };
    });
  }

});
