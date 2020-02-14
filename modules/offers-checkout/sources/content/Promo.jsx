import React from 'react';
import send from './transport';
import { css, i18n, chooseProduct } from './common/utils';

const _css = css('promo__');
export default class Promo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      copied: false,
      urlWasOpen: false,
      label: i18n(props.canInject ? 'redeem_code' : 'copy_code'),
    };
  }

  onButtonClick = () => {
    const { urlWasOpen } = this.state;
    const { voucher } = this.props;
    const { ctaurl: url, landing } = voucher;

    this.setState({
      copied: true,
      urlWasOpen: true,
      label: i18n('copied'),
    });
    if (!urlWasOpen) {
      send('openAndClosePinnedURL', { url, matchPatterns: landing || [] });
    }
    this.props.onClick();
  }

  render() {
    const { copied } = this.state;
    const { voucher, products } = this.props;

    const product = chooseProduct(products);
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('wrapper', `${product}-wrapper`)}>
        <div className={_css('container')}>
          <input
            ref={(input) => {
              if (!input || !copied) { return; }
              input.select();
              window.document.execCommand('copy');
              if (copied) { this.setState({ copied: false }); }
            }}
            readOnly
            className={_css('input', `${product}-input`)}
            value={voucher.code}
          />
          <div
            onClick={this.onButtonClick}
            className={_css('copy-code', `${product}-copy-code`)}
          >
            {this.state.label}
          </div>
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
