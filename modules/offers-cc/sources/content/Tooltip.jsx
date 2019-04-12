import React from 'react';
import send from './transport';
import { css, i18n } from './common/utils';

const _css = css('tooltip__');
export default class Tooltip extends React.Component {
  constructor() {
    super();
    this.state = {
      mouseInside: false,
    };
  }

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  render() {
    const { mouseInside } = this.state;
    return (
      <div
        onMouseEnter={() => this.setState({ mouseInside: true })}
        onMouseLeave={() => this.setState({ mouseInside: false })}
        className={_css('container')}
      >
        <div
          onClick={() => send('getEmptyFrameAndData', { hideTooltip: true })}
          className={_css('left-item')}
        >
          <div className={_css('image')} />
          <div className={_css('text')}>{i18n('offers_hub_tooltip_new_offer')}</div>
        </div>
        <div
          onClick={() => send('hideBanner')}
          className={_css('right-item', mouseInside ? 'visible' : 'not-visible')}
        >
          <div className={_css('close')} />
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
