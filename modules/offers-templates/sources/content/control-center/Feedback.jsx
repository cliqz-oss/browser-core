import React from 'react';
import { css, i18n, chooseProduct } from '../utils';

const _css = css('feedback__');
export default class Feedback extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
      vote: '',
    };
  }

  renderButtons() {
    const { products } = this.props;
    const { text, vote } = this.state;
    const disabled = !text && !vote;
    const prefix = chooseProduct(products);
    const cls = disabled
      ? ['disabled', `${prefix}-disabled`]
      : ['primary', `${prefix}-primary`];
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <li className={_css('buttons')}>
        <div
          disabled={disabled}
          type="button"
          onClick={() => !disabled && this.props.onChange({ text, vote })}
          className={_css('button', ...cls)}
        >
          {i18n('send')}
        </div>
        <div
          type="button"
          onClick={() => this.props.onSkip({ text: '' })}
          className={_css('button', 'secondary', `${prefix}-secondary`)}
        >
          {i18n('skip')}
        </div>
      </li>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  render() {
    const { voucher = {} } = this.props;
    const { template_data: { benefit, headline } = {} } = voucher;
    return (
      <div className={_css('wrapper')}>
        <div className={_css('container')}>
          {benefit && (
          <div className={_css('card-benefit')}>
            {benefit}
          </div>
          )}
          <div style={{ height: '3px' }} />
          <div className={_css('card-headline')}>
            {headline}
          </div>
          <div className={_css('title')}>
            {i18n('offer_removed')}&nbsp;&nbsp;
            <img className={_css('trash')} src="images/feedback-trash.png" alt="" />
          </div>
          <div className={_css('subtitle')}>
            {i18n('feedback_title')}
          </div>
          <ul className={_css('list')}>
            <li className={_css('list-item')}>
              <input
                onClick={e => this.setState({ vote: e.target.value })}
                type="radio"
                name="remove_feedback"
                id="feedback_option1"
                value="already_used"
              />
              <label
                className={_css('label')}
                htmlFor="feedback_option1"
              >
                {i18n('feedback_option1')}
              </label>
            </li>
            <li className={_css('list-item')}>
              <input
                onClick={e => this.setState({ vote: e.target.value })}
                type="radio"
                name="remove_feedback"
                id="feedback_option2"
                value="not_good_deal"
              />
              <label
                className={_css('label')}
                htmlFor="feedback_option2"
              >
                {i18n('feedback_option2')}
              </label>
            </li>
            <li className={_css('list-item')}>
              <input
                onClick={e => this.setState({ vote: e.target.value })}
                type="radio"
                name="remove_feedback"
                id="feedback_option3"
                value="not_relevant"
              />
              <label
                className={_css('label')}
                htmlFor="feedback_option3"
              >
                {i18n('feedback_option3')}
              </label>
            </li>
            <li>
              <textarea
                onChange={e => this.setState({ text: e.target.value })}
                value={this.state.text}
                className={_css('field')}
                rows="4"
                cols="26"
                placeholder={i18n('feedback_option4')}
              />
            </li>
            {this.renderButtons()}
          </ul>
        </div>
      </div>
    );
  }
}
