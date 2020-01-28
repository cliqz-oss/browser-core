import React from 'react';
import Survey from './Survey';
import Reason from './Reason';
import ThankYou from './ThankYou';
import Success from './Success';
import { css, resize } from './common/utils';

const _css = css('feedback__');
export default class Feedback extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      view: props.view || 'feedback',
    };
  }

  onClick = view => this.setState({ view }, resize)

  render() {
    const { view } = this.state;
    const { domain, back } = this.props;

    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('container')}>
        <div className={_css('logo-area')}>
          <div className={_css('logo')} />
        </div>
        <div style={{ width: '3px' }} />
        {view === 'feedback' && <Survey onClick={this.onClick} domain={domain} back={back} />}
        {view === 'reason' && <Reason onClick={this.onClick} domain={domain} back={back} />}
        {view === 'thank-you' && <ThankYou />}
        {view === 'success' && <Success />}
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
