import React from 'react';
import ToggleDisplay from 'react-toggle-display';

export default class Feedback extends React.Component {
  constructor(props) {
    super(props);
    this.state = Object.freeze({
      showFeedbackContent: false,
      showFeedbackVote: false,
      showFeedbackComment: false
    });

    this.handleVote = this.handleVote.bind(this);
    this.handleFeedback = this.handleFeedback.bind(this);
    this.submitFeedback = this.submitFeedback.bind(this);
  }

  handleVote() {
    this.setState({
      showFeedbackComment: !this.state.showFeedbackComment
    });

    this.setState({
      showFeedbackVote: !this.state.showFeedbackVote
    });
    // this.props.sendFeedbackVote(vote);
  }

  handleFeedback(event) {
    event.preventDefault();
    this.setState({
      showFeedbackVote: !this.state.showFeedbackVote
    });
    this.setState({
      showFeedbackContent: !this.state.showFeedbackContent
    });
  }

  submitFeedback() {
    const comment = this._comment.value;
    this.props.submitFeedbackForm(comment);
  }

  render() {
    return (
      <div>
        <button
          id="feedback-button"
          onClick={this.handleFeedback}
        >
            Feedback
        </button>
        <div
          id="feedback-content"
          style={{ display: this.state.showFeedbackContent ? 'block' : 'none' }}
        >
          <ToggleDisplay show={this.state.showFeedbackVote}>
            <div
              id="feedback-vote-wrapper"
            >
              <span className="feedback-text">
                How do you like MyOffrz feature?
              </span>
              <p>
                <button
                  className="feedback-button"
                  data-vote="up"
                  onClick={() => this.handleVote('up')}
                />
                <button
                  className="feedback-button"
                  data-vote="down"
                  onClick={() => this.handleVote('down')}
                />
              </p>
            </div>
          </ToggleDisplay>

          <ToggleDisplay hide={this.state.showFeedbackVote}>
            <div
              id="feedback-comment-wrapper"
              style={{ display: this.state.showFeedbackComment ? 'block' : 'none' }}
            >
              <span className="feedback-text">
                Do you have any comments
              </span>
              <textarea
                id="feedback-textarea"
                rows="3"
                cols="8"
                ref={(comment) => { this._comment = comment; }}
              />
              <button
                id="submit-feedback"
                onClick={this.submitFeedback}
              >
                Send
              </button>
            </div>
          </ToggleDisplay>
        </div>
      </div>
    );
  }
}

