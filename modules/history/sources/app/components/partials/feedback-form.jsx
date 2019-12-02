import React from 'react';
import PropTypes from 'prop-types';
import t from '../../../i18n';

export default class FeedbackForm extends React.Component {
  state = {
    value: '',
  };

  onChange = (ev) => {
    this.setState({
      value: ev.target.value,
    });
  };

  render() {
    const { value } = this.state;
    const { handleSubmitClick } = this.props;

    return (
      <React.Fragment>
        <div className="feedback-question">{t('feedback_step2')}</div>

        <textarea className="feedback-textarea" onChange={this.onChange} value={value} />

        <button
          className="send"
          onClick={() => handleSubmitClick({ comments: value })}
          type="button"
        >
          {t('feedback_submit')}
        </button>
      </React.Fragment>
    );
  }
}

FeedbackForm.propTypes = {
  handleSubmitClick: PropTypes.func.isRequired,
};
