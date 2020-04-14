import React from 'react';
import Picture from '../widgets/Picture';
import send from '../transport';
import { css } from '../utils';

const _css = css('header__');
export default class Header extends React.Component {
  constructor(props) {
    super(props);
    const { voucher = {} } = props;
    this.state = {
      mouseInside: false,
      logoDataurl: voucher.logoDataurl,
    };
  }

  onHide = () => {
    if (this.props.view === 'open') {
      send('changePositionWithAnimation', { deltaRight: -329, duration: 300 });
      this.props.onChangeView('minimize');
    }
  }

  render() {
    const { mouseInside, logoDataurl } = this.state;
    const { logoUrl, logoClass } = this.props.voucher || {};
    const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('container')}>
        <Picture
          url={logoUrl}
          dataurl={logoDataurl}
          onLoadImage={dataurl => this.setState({ logoDataurl: dataurl })}
          width={sizesByClass[logoClass] || '83px'}
          height="34px"
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
