import React from 'react';
import send from './transport';
import Header from './Header';
import Menu from './Menu';
import Content from './Content';
import Footer from './Footer';
import { css, resize } from './common/utils';

const _css = css('main__');
export default class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isMenuOpen: false,
      currentView: 'cards', // or 'why-do-i-see'
    };
  }

  componentDidMount() {
    const { data: { vouchers = [], autoTrigger = false } = {} } = this.props;
    const offersCount = autoTrigger ? null : vouchers.length;
    send('sendTelemetry', { action: 'show', offersCount });
  }

  onClickMenu = (e) => {
    e.preventDefault();
    const { isMenuOpen } = this.state;
    this.setState({ isMenuOpen: !isMenuOpen });
    if (!isMenuOpen) { // but will be open
      send('sendTelemetry', { target: 'menu' });
    }
  }

  onClickMenuOption = (option) => {
    const { currentView } = this.state;
    if (option === 'help') {
      send('openURL', {
        url: 'https://myoffrz.com/kontakt/',
        closePopup: false,
      });
    }
    const target = option === 'help' ? 'help' : 'why';
    send('sendTelemetry', { target });
    this.setState({
      currentView: option === 'why-do-i-see'
        ? 'why-do-i-see'
        : currentView,
      isMenuOpen: false,
    }, () => {
      if (option === 'why-do-i-see') { resize(); }
    });
  }

  onOutsideClick = (e) => {
    if (!e.isDefaultPrevented()) {
      this.setState({ isMenuOpen: false });
    }
  }

  onChangeView = (option) => {
    this.setState({
      currentView: option === 'why-do-i-see'
        ? 'why-do-i-see'
        : 'cards',
    }, resize);
  }

  render() {
    const { isMenuOpen, currentView } = this.state;
    const { data: { vouchers = [], products = {}, autoTrigger = false } = {} } = this.props;
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div onClick={this.onOutsideClick} className={_css('container')}>
        <div className={_css('header')}>
          <Header
            products={products}
            autoTrigger={autoTrigger}
            activeMenu={isMenuOpen}
            onClickMenu={this.onClickMenu}
          />
        </div>
        {isMenuOpen && <Menu onClick={this.onClickMenuOption} />}
        <div className={_css('content')}>
          <Content
            products={products}
            onChangeView={this.onChangeView}
            currentView={currentView}
            vouchers={vouchers}
            autoTrigger={autoTrigger}
          />
        </div>
        <div className={_css('footer')}>
          <Footer products={products} />
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
