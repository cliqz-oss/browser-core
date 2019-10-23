import React from 'react';
import PropTypes from 'prop-types';
import t from '../../../i18n';

import FeedbackForm from './feedback-form';
import FeedbackThankYou from './feedback-thank-you';
import FeedbackVote from './feedback-vote';

export default class Feedback extends React.Component {
  state = {
    feedbackStep: 0,
    hasVoted: false,
    vote: undefined,
  }

  handleOpenClick = () => {
    if (!this.state.hasVoted) {
      this.setState({
        feedbackStep: 1,
      });
    }
  }

  handleCloseClick = () => {
    this.setState({
      feedbackStep: 0,
    });
  }

  handleVoteClick = ({ vote }) => {
    this.setState({
      feedbackStep: 2,
      vote,
    });
  }

  handleSubmitClick = ({ comments }) => {
    const feedback = {
      comments,
      target: 'history_tool',
      vote: this.state.vote,
    };

    this.setState({
      feedbackStep: 3,
    });

    setTimeout(() => {
      this.setState({
        feedbackStep: 0,
        hasVoted: true,
      });
    }, 1500);

    this.props.sendUserFeedback(feedback);
  }

  getContainerClass = () => (this.state.feedbackStep === 3
    ? 'small'
    : 'large');

  render() {
    return (
      <section className={`feedback-container ${this.getContainerClass()}`}>
        <div className="feedback-header-container">
          <button
            className="feedback-open-btn"
            onClick={this.handleOpenClick}
            type="button"
          >
            {t('feedback_open')}
          </button>

          {this.state.feedbackStep > 0 && (
            <button
              className="feedback-close-btn"
              onClick={this.handleCloseClick}
              type="button"
            />
          )}
        </div>

        {this.state.feedbackStep === 1 && (
          <FeedbackVote
            handleVoteClick={this.handleVoteClick}
          />
        )}

        {this.state.feedbackStep === 2 && (
          <FeedbackForm
            handleSubmitClick={this.handleSubmitClick}
          />
        )}

        {this.state.feedbackStep === 3 && (
          <FeedbackThankYou />
        )}
      </section>
    );
  }
}

Feedback.propTypes = {
  sendUserFeedback: PropTypes.func.isRequired,
};
