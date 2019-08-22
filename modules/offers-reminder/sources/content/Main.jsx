import React from 'react';
import Content from './Content';
import send from './transport';
import { css, chooseProduct } from './common/utils';

const _css = css('main__');
export default class Main extends React.Component {
  constructor(props) {
    super(props);
    // states 'new' and 'open' are the same for UI
    const view = props.view === 'new' ? 'open' : (props.view || 'open');
    this.state = { view };
  }

  onMouseEnterFloatingButton = () => {
    if (this.state.view === 'minimize') {
      send('changePosition', { deltaRight: 29 });
    }
  }

  onMouseLeaveFloatingButton = () => {
    if (this.state.view === 'minimize') {
      send('changePosition', { deltaRight: -29 });
    }
  }

  onClickFloatingButton = () => {
    // assert: only two possible views: open | minimize
    const { view } = this.state;
    const beforeWasOpen = view === 'open';
    const newView = beforeWasOpen ? 'minimize' : 'open';
    const newDelta = beforeWasOpen ? -329 : 300;
    const duration = beforeWasOpen ? 300 : 450;

    if (newView === 'minimize') {
      // during animation by side effect system fires event on-mouse-leave
      // this could produce strange effects with minimaze
      // so lets set state in the end of transition
      setTimeout(() => this.setState({ view: newView }), duration);
    } else {
      this.setState({ view: newView });
    }
    send('changePositionWithAnimation', { deltaRight: newDelta, duration });
    send('remindersAction', { action: newView, domain: this.props.domain });
    send('sendTelemetry', { target: newView });
  }

  onChangeView = (newView) => {
    this.setState({ view: newView });
    send('remindersAction', { action: newView, domain: this.props.domain });
    send('sendTelemetry', { target: newView });
  }

  render() {
    const { voucher = {}, products = {} } = this.props;
    const { view } = this.state;
    const product = chooseProduct(products);
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('container')}>
        <div
          className={_css('floating-button-area')}
          onMouseEnter={this.onMouseEnterFloatingButton}
          onMouseLeave={this.onMouseLeaveFloatingButton}
        >
          <div
            onClick={this.onClickFloatingButton}
            className={_css('floating-button-base', `${product}-floating-button`)}
          />
        </div>
        <div style={{ width: '3px' }} />
        <div className={_css('content')}>
          <Content
            products={products}
            voucher={voucher}
            view={view}
            onChangeView={this.onChangeView}
          />
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
