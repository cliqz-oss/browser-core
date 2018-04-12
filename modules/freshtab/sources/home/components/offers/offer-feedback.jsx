import React from 'react';
import ToggleDisplay from 'react-toggle-display';
import cliqz from '../../cliqz';
import { tt } from '../../i18n';
import telemetry from '../../services/telemetry/base';

export default class OfferFeedback extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleOptionChange = this.handleOptionChange.bind(this);
    this.handleTextareaChange = this.handleTextareaChange.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
    this.state = {
      selectedOption: null,
      submitDisabled: true,
      showForm: true,
    };
  }

  handleTextareaChange() {
    this.setState({
      submitDisabled: false,
    });
  }

  handleOptionChange(event) {
    this.setState({
      selectedOption: event.target.value,
      submitDisabled: false,
    });
  }

  handleSubmit() {
    if (this.state.submitDisabled) {
      return;
    }

    this.setState({
      showForm: false,
    });
    const comments = this._comment.value;
    const vote = this.state.selectedOption;

    telemetry({
      type: 'offrz',
      view: 'tab',
      action: 'click',
      target: 'remove_offer',
      comments,
      vote
    });
    this.props.submitFeedbackForm(vote, comments);
  }

  handleCloseClick() {
    cliqz.storage.setState(state => ({
      offers: state.offers.filter(res => res.offer_id !== this.props.offer_id),
    }));
  }

  render() {
    return (
      <div className="offer-middle-feedback offer-container">
        <button
          className="close"
          onClick={this.handleCloseClick}
        />
        <h2>
          {tt('offers-hub-feedback-title')}
        </h2>
        <ToggleDisplay show={this.state.showForm}>
          <div className="flex-container">
            <div className="col1">
              <ul>
                <li>
                  <input
                    type="radio"
                    name="remove_feedback"
                    id="feedback_option1"
                    value="already_used"
                    onChange={this.handleOptionChange}
                  />
                  <label htmlFor="feedback_option1">{tt('offers-hub-feedback-option1')}</label>
                </li>
                <li>
                  <input
                    name="remove_feedback"
                    id="feedback_option2"
                    value="not_good_deal"
                    type="radio"
                    onChange={this.handleOptionChange}
                  />
                  <label htmlFor="feedback_option2">{tt('offers-hub-feedback-option2')}</label>
                </li>
                <li>
                  <input
                    name="remove_feedback"
                    id="feedback_option3"
                    value="not_relevant"
                    type="radio"
                    onChange={this.handleOptionChange}
                  />
                  <label htmlFor="feedback_option3">{tt('offers-hub-feedback-option3')}</label>
                </li>
              </ul>
            </div>
            <div className="col2">
              <textarea
                id="feedback_option4_textarea"
                rows="2"
                placeholder={tt('offers-hub-feedback-option4')}
                ref={(comment) => { this._comment = comment; }}
                onChange={this.handleTextareaChange}
              />
            </div>
            <div className="col3">
              <div className="notification">
                {tt('offers-offer-removed')}
              </div>
              <button
                className="cta-btn"
                type="button"
                onClick={this.handleSubmit}
                disabled={this.state.submitDisabled}
              >
                <span>{tt('offers-send-feedback')}</span>
              </button>
            </div>
          </div>
        </ToggleDisplay>
        <ToggleDisplay hide={this.state.showForm}>
          <div className="thank-you">
            <h3>{tt('offers-hub-feedback-thank-you')}</h3>
            <p>{tt('offers-feedback-thank-you')}</p>
          </div>
        </ToggleDisplay>
      </div>
    );
  }
}

