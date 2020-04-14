import React from 'react';
import Header from './Header';
import Menu from './Menu';
import Content from './Content';
import Footer from './Footer';
import send from '../transport';
import { css, chooseProduct } from '../utils';

const _css = css('main__');
export default class Main extends React.Component {
  constructor(props) {
    super(props);
    const {
      data: {
        autoTrigger = false,
        shouldShowOptIn = false,
      } = {}
    } = this.props;

    this.state = {
      isMenuOpen: false,

      // possible views: opt-in | cards | why-do-i-see
      currentView: (shouldShowOptIn && autoTrigger) ? 'opt-in' : 'cards',
    };
    this._seenOffersIds = new Set();
  }

  onClickMenu = (e) => {
    e.preventDefault();
    const { isMenuOpen } = this.state;
    this.setState({ isMenuOpen: !isMenuOpen });
  }

  onClickMenuOption = (option) => {
    const { currentView } = this.state;
    const { data: { products = {} } = {} } = this.props;
    const prefix = chooseProduct(products);
    const url = prefix === 'chip'
      ? 'https://sparalarm.chip.de/kontakt/'
      : 'https://myoffrz.com/kontakt/';
    const mapper = {
      'why-do-i-see': {
        view: 'why-do-i-see',
      },
      help: {
        action: () => send('openURL', { url, closePopup: false }),
      },
      settings: {
        action: () => send('openOptions'),
      }
    };
    const { view = currentView, action = () => {} } = mapper[option];
    action();
    this.setState({ currentView: view, isMenuOpen: false }, () => {
      if (option === 'why-do-i-see') { window.__globals_resize(); }
    });
  }

  onOutsideClick = (e) => {
    if (!e.isDefaultPrevented()) {
      this.setState({ isMenuOpen: false });
    }
  }

  onChangeSeenOffers = seenOffersIds =>
    seenOffersIds.forEach(offerId => this._seenOffersIds.add(offerId))

  onChangeView = (option) => {
    this.setState({
      currentView: option === 'why-do-i-see'
        ? 'why-do-i-see'
        : 'cards',
    }, window.__globals_resize);
  }

  renderHeader() {
    const { isMenuOpen } = this.state;
    const {
      data: {
        shouldShowOptIn = false,
        vouchers = [],
        products = {},
        autoTrigger = false,
      } = {}
    } = this.props;

    if (!autoTrigger && products.ghostery) { return null; }
    const prefix = chooseProduct(products);

    return (
      <div className={_css('header', `${prefix}-header`)}>
        <Header
          shouldShowOptIn={shouldShowOptIn}
          vouchers={vouchers}
          products={products}
          autoTrigger={autoTrigger}
          activeMenu={isMenuOpen}
          onClickMenu={this.onClickMenu}
          onClose={() => {
            if (!autoTrigger) { return; }
            const offersIds = [...this._seenOffersIds].map((offerId) => {
              const payload = {
                signal_type: 'offer-action-signal',
                element_id: 'offer_closed',
                offer_id: offerId,
              };
              return payload;
            });
            send('sendOfferActionSignalMany', offersIds);
          }}
        />
      </div>
    );
  }

  renderFooter() {
    const {
      data: {
        products = {},
        autoTrigger = false,
        shouldShowOptIn = false,
      } = {}
    } = this.props;
    if (!autoTrigger && products.ghostery) { return null; }

    return (
      <div className={_css('footer')}>
        <Footer
          shouldShowOptIn={shouldShowOptIn}
          products={products}
          autoTrigger={autoTrigger}
        />
      </div>
    );
  }

  render() {
    const { isMenuOpen, currentView } = this.state;
    const {
      data: {
        vouchers = [],
        products = {},
        autoTrigger = false,
        shouldShowOnboarding = false,
      } = {}
    } = this.props;
    /* eslint-disable jsx-a11y/no-static-element-interactions */

    return (
      <div onClick={this.onOutsideClick} className={_css('container')}>
        {this.renderHeader()}
        {isMenuOpen && <Menu products={products} onClick={this.onClickMenuOption} />}
        <div className={_css('content')}>
          <Content
            onChangeSeenOffers={this.onChangeSeenOffers}
            products={products}
            onChangeView={this.onChangeView}
            currentView={currentView}
            vouchers={vouchers}
            autoTrigger={autoTrigger}
            shouldShowOnboarding={shouldShowOnboarding}
          />
        </div>
        {this.renderFooter()}
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
