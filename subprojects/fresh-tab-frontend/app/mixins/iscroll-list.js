/* global IScroll */
import Ember from 'ember';

export default Ember.Mixin.create({
  classNames: ['content', 'has-header'],
  classNameBindings: ["hasFooter:has-footer"],

  didInsertElement() {
    var topLevelContainer = this.$().closest(".liquid-child");
    var header = topLevelContainer.find(".bar-header");
    var footer = topLevelContainer.find(".bar-footer");
    let height = topLevelContainer.height();

    if (!header[0]) {
      header = Ember.$(".bar-header");
    }

    if (header[0]) {
      height = height - header.outerHeight();
    }

    if(!footer[0]) {
      footer = Ember.$(".bar-footer");
    }

    if (this.get("hasFooter")) {
      height = height - footer.outerHeight();
    }

    this.$().height(height);

    this.scroll = new IScroll(this.element, {
      mouseWheel: true,
      tap: true,
    });
  },

  updateScroll: function () {
    const length = this.get("length");
    // refresh scroll only if list size changed
    if (this.get("lastLength") !== length) {
      this.set("lastLength", length);
      this.scroll.refresh();
    }
  }.on("didRender"),
});
