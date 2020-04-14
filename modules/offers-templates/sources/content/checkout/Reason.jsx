import React from 'react';
import send from '../transport';
import { css, i18n } from '../utils';

const _css = css('reason__');
export default class Reason extends React.Component {
  state = {
    vote: null,
  }

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  render() {
    const { domain, back } = this.props;
    return (
      <div className={_css('content')}>
        <div style={{ height: '10px' }} />
        <div className={_css('header')}>
          <div className={_css('title')}>
            {i18n('oops')}&nbsp;
            <div className={_css('emoji')} />
          </div>
          <div
            onClick={() => {
              send('checkoutsAction', { action: 'close', domain });
              send('hideBanner');
            }}
            className={_css('close')}
          />
        </div>
        <div style={{ height: '10px' }} />
        <div className={_css('subtitle')}>
          {i18n('something_went_wrong')}
        </div>
        <div style={{ height: '10px' }} />
        <div className={_css('description')}>
          {i18n('help_improve_feedback')}
        </div>
        <div style={{ height: '15px' }} />
        <Option
          onClick={e => this.setState({ vote: e.target.value })}
          id={1}
          value="option1"
          label={i18n('code_not_valid')}
        />
        <Option
          onClick={e => this.setState({ vote: e.target.value })}
          id={2}
          value="option2"
          label={i18n('conditions_not_met')}
        />
        <Option
          onClick={e => this.setState({ vote: e.target.value })}
          id={3}
          value="option3"
          label={i18n('dont_know')}
        />
        <div style={{ height: '15px' }} />
        <div
          onClick={() => {
            if (!this.state.vote) { return; }
            send('checkoutsAction', { action: 'reason', domain });
            const action = `coupon_autofill_field_not_found_why_${this.state.vote}`;
            send('log', { action, back });
            this.props.onClick('thank-you');
          }}
          className={_css('button', `${this.state.vote ? '' : 'disabled'}`)}
        >
          {i18n('send')}
        </div>
        <div style={{ height: '10px' }} />
      </div>
    );
  }
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}

function Option(props) {
  const {
    onClick,
    id,
    value,
    label,
  } = props;

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div key={id} className={_css('option')}>
      <input
        onClick={onClick}
        type="radio"
        name="reason"
        id={`reason_option${id}`}
        value={value}
      />
      <label
        className={_css('label')}
        htmlFor={`reason_option${id}`}
      >
        {label}
      </label>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
