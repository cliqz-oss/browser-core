import React from 'react';
import send from './transport';
import { css, i18n, chooseProduct } from './common/utils';

const _css = css('tooltip__');
export default class Tooltip extends React.Component {
  constructor() {
    super();
    this.state = {
      mouseInside: false,
    };
  }

  componentDidMount() {
    const { data: { offerId } = {} } = this.props;
    send('sendOfferActionSignal', {
      signal_type: 'offer-action-signal',
      element_id: 'tooltip_shown',
      offer_id: offerId,
    });
  }

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  render() {
    const { mouseInside } = this.state;
    const { data: { products = {}, offerId } = {} } = this.props;
    const product = chooseProduct(products);
    return (
      <div
        onMouseEnter={() => this.setState({ mouseInside: true })}
        onMouseLeave={() => this.setState({ mouseInside: false })}
        className={_css('container')}
      >
        <div
          onClick={() => {
            send('getEmptyFrameAndData', { hideTooltip: true });
            send('sendOfferActionSignal', {
              signal_type: 'offer-action-signal',
              element_id: 'tooltip_clicked',
              offer_id: offerId,
            });
          }}
          className={_css('left-item')}
        >
          <div className={_css('image', `${product}-image`)} />
          <div className={_css('text')}>{i18n('offers_hub_tooltip_new_offer')}</div>
        </div>
        <div
          onClick={() => {
            send('sendOfferActionSignal', {
              signal_type: 'offer-action-signal',
              element_id: 'tooltip_closed',
              offer_id: offerId,
            });
            send('hideBanner');
          }}
          className={_css('right-item', mouseInside ? 'visible' : 'not-visible')}
        >
          <div className={_css('close')} />
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
