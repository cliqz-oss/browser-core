import Ember from "ember";
import BrowserLink from "../mixins/browser-link";

export default Ember.Component.extend(BrowserLink, {
  classNames: ["card", "history-message"],
  classNameBindings: [
    "message.isCurrent:is-current-tab",
    "message.isActive:is-active-tab"
  ],

  showMetaBox: Ember.computed.or("description", "message.image"),
  showTime: Ember.computed("message", "message.isActive", function () {
    return this.get("message") && !this.get("message.isActive");
  }),

  title: Ember.computed("message.title", "contact.title", function () {
    return this.get("message.title") || this.get("contact.title");
  }),

  description: Ember.computed("message.description", "contact.description", function () {

    return this.get("message.description") || this.get("contact.description");
  }),

  url: Ember.computed("message.url", "contact.domain", function () {
    return this.get("message.url") || "http://"+this.get("contact.domain");
  }),
});
