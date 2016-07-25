import Ember from "ember";
import BrowserLink from "../mixins/browser-link";

export default Ember.Component.extend(BrowserLink, {

  classNames: ["card", "list", "history-message"],
  classNameBindings: [
    "model.isCurrent:is-current-tab",
    "model.isActive:is-active-tab"
  ],

  hasMeta: Ember.computed.or("model.image", "model.description"),

  url: Ember.computed.alias("model.url"),

  image: Ember.computed("model.image", "model.contact.image", function () {
    const messageImage = this.get("model.image"),
          contactImage = this.get("model.contact.image");

    if (messageImage !== contactImage) {
      return messageImage;
    } else {
      return null;
    }
  }),

  description: Ember.computed("model.description", "model.contact.description", function () {
    const messageDescription = this.get("model.description"),
          contactDescription = this.get("model.contact.description");

    if (messageDescription !== contactDescription) {
      return messageDescription;
    } else {
      return null;
    }
  }),

  title: Ember.computed("model.title", "model.contact.title", function () {
    const messageTitle = this.get("model.title"),
          contactTitle = this.get("model.contact.title");

    if (messageTitle !== contactTitle) {
      return messageTitle;
    } else {
      return null;
    }
  }),
});
