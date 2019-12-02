import React from 'react';
import PropTypes from 'prop-types';
import t from '../../../i18n';

const FeedbackVote = ({ handleVoteClick }) => (
  <React.Fragment>
    <div className="feedback-question">
      {t('feedback_step1')}
    </div>

    <div className="feedback-vote-container">
      <button
        className="feedback-btn feedback-positive-btn"
        onClick={() => { handleVoteClick({ vote: 'up' }); }}
        type="button"
      />
      <button
        className="feedback-btn feedback-negative-btn"
        onClick={() => { handleVoteClick({ vote: 'down' }); }}
        type="button"
      />
    </div>
  </React.Fragment>
);

FeedbackVote.propTypes = {
  handleVoteClick: PropTypes.func.isRequired,
};

export default FeedbackVote;
