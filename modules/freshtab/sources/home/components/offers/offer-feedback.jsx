import React from 'react';
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
      show: true,
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
      show: false,
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
    cliqz.freshtab.dismissOffer(this.props.offer_id, 'MESSAGE_HANDLER_FRESHTAB_OFFERS');
    cliqz.storage.setState((prevState) => {
      const prev = prevState;
      const messages = {
        ...prev.messages,
      };
      delete messages[this.props.offer_id];
      return {
        messages,
      };
    });
  }

  undoDeleteOffer = () => {
    this.props.toggleComponents();
  }

  render() {
    return (
      <div className="offer-middle-feedback offer-container offer-unit">
        <button
          className="close"
          onClick={this.handleCloseClick}
        />
        {this.state.show ?
          <div>
            <h2 className="feedback-header">
              {tt('offers_hub_feedback_title')}
            </h2>
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
                    <label htmlFor="feedback_option1">{tt('offers_hub_feedback_option1')}</label>
                  </li>
                  <li>
                    <input
                      name="remove_feedback"
                      id="feedback_option2"
                      value="not_good_deal"
                      type="radio"
                      onChange={this.handleOptionChange}
                    />
                    <label htmlFor="feedback_option2">{tt('offers_hub_feedback_option2')}</label>
                  </li>
                  <li>
                    <input
                      name="remove_feedback"
                      id="feedback_option3"
                      value="not_relevant"
                      type="radio"
                      onChange={this.handleOptionChange}
                    />
                    <label htmlFor="feedback_option3">{tt('offers_hub_feedback_option3')}</label>
                  </li>
                </ul>
              </div>
              <div className="col2">
                <textarea
                  id="feedback_option4_textarea"
                  rows="2"
                  placeholder={tt('offers_hub_feedback_option4')}
                  ref={(comment) => { this._comment = comment; }}
                  onChange={this.handleTextareaChange}
                />
              </div>
              <div className="col3">
                <div className="notification">
                  {tt('offers_offer_removed')}
                  <br />
                  <button onClick={this.undoDeleteOffer}>UNDO</button>
                </div>
                <button
                  className="cta-btn"
                  type="button"
                  onClick={this.handleSubmit}
                  disabled={this.state.submitDisabled}
                >
                  <span>{tt('offers_send_feedback')}</span>
                </button>
              </div>
            </div>
          </div>
          :
          <div className="vertical-align">
            <div className="thank-you">
              <h3>{tt('offers_hub_feedback_thank_you')}</h3>
              <p>{tt('offers_feedback_thank_you')}</p>
            </div>
          </div>
        }
      </div>
    );
  }
}
