import React from 'react';
import send from './transport';
import { css, i18n } from './common/utils';

const _css = css('tooltip-extra__');
export default class TooltipExtra extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mouseInside: false,
    };
  }

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  renderBottom() {
    const { data: { labels = [], logo } = {} } = this.props;
    return (
      <div
        onClick={() => send('getEmptyFrameAndData', { hideTooltip: true })}
        className={_css('bottom-container')}
      >
        <div className={_css('bottom-left-item')}>
          {labels.map(label => (
            <React.Fragment key={label}>
              <div key={label} className={_css(label, 'label')}>{i18n(`offers_${label}`)}</div>
              <div key={`${label}vspace`} style={{ height: '2px' }} />
            </React.Fragment>
          ))}
        </div>
        <div className={_css('bottom-right-item')}>
          <div
            style={{ backgroundImage: `url(${logo})` }}
            className={_css('image')}
          />
        </div>
      </div>
    );
  }

  renderTop() {
    const { mouseInside } = this.state;
    const { data: { headline = '', benefit = '' } = {} } = this.props;
    return (
      <div className={_css('top-container')}>
        <div
          onClick={() => send('getEmptyFrameAndData', { hideTooltip: true })}
          className={_css('top-left-item')}
        >
          <div className={_css('text')}>
            {benefit}
            {' '}
            {headline}
          </div>
        </div>
        <div
          onClick={() => send('hideBanner')}
          className={_css('top-right-item', mouseInside ? 'visible' : 'not-visible')}
        >
          <div className={_css('close')} />
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  render() {
    const { data: { backgroundColor } = {} } = this.props;
    return (
      <div
        style={{ borderLeftColor: backgroundColor }}
        className={_css('wrapper')}
        onMouseEnter={() => this.setState({ mouseInside: true })}
        onMouseLeave={() => this.setState({ mouseInside: false })}
      >
        {this.renderTop()}
        {this.renderBottom()}
      </div>
    );
  }
}
