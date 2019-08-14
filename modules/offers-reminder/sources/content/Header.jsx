import React from 'react';
import send from './transport';
import { css } from './common/utils';

const _css = css('header__');
export default class Header extends React.Component {
  state = {
    mouseInside: false,
  }

  onHide = () => {
    if (this.props.view === 'open') {
      send('changePositionWithAnimation', { deltaRight: -329, duration: 300 });
      this.props.onChangeView('minimize');
    }
  }

  render() {
    const { mouseInside } = this.state;
    const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('container')}>
        <div
          style={{
            backgroundImage: `url(${this.props.voucher.logo})`,
            width: sizesByClass[this.props.voucher.logoClass] || '70px',
          }}
          className={_css('logo')}
        />
        <div className={_css('buttons')}>
          <span
            onClick={this.onHide}
            onMouseEnter={() => this.setState({ mouseInside: true })}
            onMouseLeave={() => this.setState({ mouseInside: false })}
            className={_css('hide-wrapper')}
          >
            <span className={_css('hide', mouseInside ? 'hide-hover' : '')} />
          </span>
          <span
            onClick={() => {
              this.props.onChangeView('close');
              send('hideBanner');
            }}
            className={_css('cross')}
          />
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
