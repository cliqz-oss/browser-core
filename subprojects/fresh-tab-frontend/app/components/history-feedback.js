import Ember from 'ember';

export default Ember.Component.extend({
  history: Ember.inject.service('history-sync'),

  feedbackStep1: Ember.computed.equal('currentFeedbackStep', 1), // Show thumb up/down vote buttons
  feedbackStep2: Ember.computed.equal('currentFeedbackStep', 2), // Show textarea for comments
  feedbackStep3: Ember.computed.equal('currentFeedbackStep', 3), // Show 'thank you' message
  feedbackStep4: Ember.computed.equal('currentFeedbackStep', 4), // Show textarea for more comments
  closeButtonVisibility: Ember.computed('currentFeedbackStep', function() {
    if (this.get('currentFeedbackStep') > 0) {
      return "visible";
    } else {
      return "invisible";
    }
  }),

  setup: function() {
    // Show feedback automatically after history UI has been seen
    // more than 5 times and if user haven't voted before
    if(localStorage.getItem('nShowTimes') >= 5
        && !localStorage.getItem('feedbackVoted')) {
      this.actions.startFeedback.call(this);
    }
  }.on('init'),

  focusInput: function() {
    if ([2,4].indexOf(this.get('currentFeedbackStep')) === -1) {
      return;
    }
    Ember.run.next(() => {
      this.$('textarea').focus();
    })
  }.observes('currentFeedbackStep'),

  actions: {
    startFeedback() {
      if (!localStorage.getItem('feedbackVoted')) {
        this.set('currentFeedbackStep', 1);
      } else {
        this.set('currentFeedbackStep', 4);
      }
    },
    startPositiveFeedback() {
      this.get('history').sendUserFeedback({
        target: 'history_tool',
        vote: 'up'
      });
      localStorage.setItem('feedbackVoted', 'up');
      this.set('currentFeedbackStep', 2);
    },
    startNegativeFeedback() {
      this.get('history').sendUserFeedback({
        target: 'history_tool',
        vote: 'down'
      });
      localStorage.setItem('feedbackVoted', 'down');
      this.set('currentFeedbackStep', 2);
    },
    submitComments(comments) {
      if (comments.trim()) {
        this.get('history').sendUserFeedback({
          target: 'history_tool',
          vote: localStorage.getItem('feedbackVoted'),
          comments: comments.trim(),
        });
      }
      this.set('currentFeedbackStep', 3);
      Ember.run.later(() => {
        this.set('currentFeedbackStep', 0);
      }, 2000);
    },
    submitMoreComments(comments) {
      if (comments.trim()) {
        this.get('history').sendUserFeedback({
          target: 'history_tool',
          comments: comments.trim(),
        });
      }
      this.set('currentFeedbackStep', 3);
      Ember.run.later(() => {
        this.set('currentFeedbackStep', 0);
      }, 2000);
    },
    closeFeedback() {
      this.set('currentFeedbackStep', 0);
    }
  }
});
