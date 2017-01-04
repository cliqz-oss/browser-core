import Ember from 'ember';
//import ResizeAware from 'ember-resize/mixins/resize-aware';

const threeNewsBreakpoint = 809; //add 40px
const twoNewsBreakpoint = 640;

export default Ember.Component.extend({
  resizeWidthSensitive: true,
  cliqz: Ember.inject.service(),
  resizeService: Ember.inject.service(),
  pageNum: 0,
  maxHeight: Ember.computed.max("heights"),

  isOnePage: Ember.computed.equal("pages.length", 1),

  page: Ember.computed('pages.[]', 'pageNum', function () {
    return this.get('pages')[this.get("pageNum")];
  }),

  pages: Ember.computed('model.[]', 'pageSize', function () {
    const pageSize = this.get('pageSize');
    const model = this.get("model").toArray();
    const ret = [];

    while (model.length > 0) {
      ret.push(model.splice(0, pageSize));
    }
    return ret;
  }),

  setupResize: function(){
    this.get('resizeService').on('didResize', event => {
      this.didResize(window.innerWidth, window.innerHeight, event)
    })
  }.on('init'),


  didResize(width) {
    this.set('pageNum', 0)

    this.updatePageSize(width);
  },

  updatePageSize: function(width) {
    if(width > threeNewsBreakpoint) {
      this.set('pageSize', 3);
    } else {
      if(width > twoNewsBreakpoint) {
        this.set('pageSize', 2);
      } else {
        this.set('pageSize', 1);
      }
    }
  },

  setupPageSize: function() {
    const width = window.outerWidth
    this.updatePageSize(width)

  }.on("init"),

  setupHeights: function () {
    this.set("heights", []);
  }.on("init"),

  clearHeights: function () {
    const heights = this.get("heights");
    heights.clear();
  }.observes("pageNum"),

  nextPage() {
    const pageNum = this.get("pageNum");
    if (pageNum + 1 === this.get("pages.length") ) {
      this.set('pageNum', 0);
    } else {
      this.set('pageNum', this.get('pageNum') + 1);
    }
  },

  autoRotate: function () {
    // cancel timer on manual page change
    Ember.run.cancel(this.get("timer"));

    // do nothing if there are no pages to rotate
    if (this.get("pageSize") === this.get("model.length")) {
      return;
    }

    const timer = Ember.run.later( () => {
      this.animate(function() {
        this.nextPage();
      }.bind(this));
    }, 15000);
    this.set('timer', timer);
  }.on('didInsertElement').observes("pageNum", "pageSize"),

  actions: {

    next() {
      this.nextPage();
    },

    setPage(num) {
      this.animate(function() {
        this.set('pageNum', num);
      }.bind(this));
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'topnews-pagination-dots',
        target_index: num
      });
      this.autoRotate();
     },

    calculateHeight(height) {
      const heights = this.get("heights");
      heights.pushObject(height);
    }
  },

  animate: function(setNextPage) {
    // force stop the timer to avoid multiple page changes
    Ember.run.cancel(this.get("timer"));

    //stop rotation on hover
    if(this.$('.topnews:hover') && this.$('.topnews:hover').length ===0 ) {
      this.$().find('.content').fadeOut(function() {
        setNextPage();
      }).fadeIn();
    }
  }

});
