import React from 'react';
import send from './transport';
import Badge from './Badge';
import Card from './Card';
import Feedback from './Feedback';
import WhyDoIsee from './WhyDoIsee';
import Empty from './Empty';
import { resize } from './common/utils';

export default class Content extends React.Component {
  constructor(props) {
    super(props);
    const cards = {};
    props.vouchers.forEach((v) => {
      cards[v.offer_id] = {
        isCodeHidden: v.isCodeHidden,
        status: 'active',
      };
    });
    this.state = {
      activeCard: props.vouchers.length && props.vouchers[0].offer_id,
      cards,
    };
  }

  componentDidMount() {
    if (this.props.vouchers.length !== 0) { // not empty reward box
      send('seenOffer', { offer_id: this.state.activeCard });
      send('sendTelemetry', { action: 'show_offer' });
    }
  }

  onClickBadge = offerId => () => {
    this.setState({ activeCard: offerId }, resize);
    send('sendOfferActionSignal', {
      signal_type: 'offer-action-signal',
      element_id: 'offer_expanded',
      offer_id: offerId,
    });
    send('seenOffer', { offer_id: offerId });
    send('sendTelemetry', { action: 'show_offer' });
    send('sendTelemetry', { target: 'expand' });
  }

  onRemoveCard = offerId => () => {
    const { cards } = this.state;
    cards[offerId].status = 'in-feedback';
    this.setState({ cards }, resize);
    send('sendOfferActionSignal', {
      signal_type: 'remove-offer',
      element_id: 'offer_removed',
      offer_id: offerId,
    });
    send('sendTelemetry', { target: 'remove' });
  }

  onChangeCodeStatus = offerId => () => {
    const { cards } = this.state;
    cards[offerId].isCodeHidden = false;
    this.setState({ cards });
  }

  onChangeFeedback = (offerId, action) => ({ text, vote }) => {
    const { cards } = this.state;
    const { vouchers } = this.props;
    cards[offerId].status = 'deleted';
    const card = vouchers.find(v => cards[v.offer_id].status === 'active') || {};
    this.setState({ cards, activeCard: card.offer_id }, resize);
    const [target, newVote] = action === 'skip'
      ? ['skip_feedback', undefined]
      : ['feedback_after_removing', vote || 'other'];
    const message = {
      comments: text,
      vote: newVote,
      offer_id: offerId,
    };
    send('sendUserFeedback', { ...message, target: 'remove_offer' });
    send('sendTelemetry', { ...message, target, comments: undefined });
  }

  onCloseWhyDoIsee = () => this.props.onChangeView('cards');

  renderFeedback(activeCard, i) {
    const { products } = this.props;
    return (
      <Feedback
        shouldPad={i !== 0}
        products={products}
        onChange={this.onChangeFeedback(activeCard, 'send')}
        onSkip={this.onChangeFeedback(activeCard, 'skip')}
      />
    );
  }

  renderActiveCard = (voucher, i) => {
    const { products, autoTrigger, abtestInfo = {} } = this.props;
    const { activeCard, cards } = this.state;
    const cardStatus = cards[activeCard].status;
    return (
      <React.Fragment key={activeCard}>
        {cardStatus === 'in-feedback' && this.renderFeedback(activeCard, i)}
        {cardStatus === 'active' && (
        <Card
          products={products}
          abtestInfo={abtestInfo}
          onRemove={this.onRemoveCard(activeCard)}
          onChangeCodeStatus={this.onChangeCodeStatus(activeCard)}
          key={activeCard + String(cardStatus)}
          isCodeHidden={cards[activeCard].isCodeHidden}
          voucher={voucher}
          autoTrigger={autoTrigger}
        />
        )}
      </React.Fragment>
    );
  }

  renderBadge = (voucher, i) =>
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    (
      <div key={i} onClick={this.onClickBadge(voucher.offer_id)}>
        <Badge key={i} voucher={voucher} />
      </div>
    )
    /* eslint-enable jsx-a11y/no-static-element-interactions */


  renderVoucher = (voucher, i) => {
    const { activeCard } = this.state;
    return voucher.offer_id === activeCard
      ? this.renderActiveCard(voucher, i)
      : this.renderBadge(voucher, i);
  }

  renderVouchers = () => {
    const { vouchers, products, autoTrigger } = this.props;
    const { activeCard, cards } = this.state;
    const activeVouchers = vouchers.filter((voucher) => {
      const cardStatus = cards[voucher.offer_id].status;
      return cardStatus === 'active'
        || (cardStatus === 'in-feedback' && activeCard === voucher.offer_id);
    });
    return activeVouchers.length === 0
      ? <Empty products={products} autoTrigger={autoTrigger} />
      : activeVouchers.map(this.renderVoucher);
  }

  render() {
    const { currentView, products } = this.props;
    return (
      <div className="content__size">
        {currentView === 'why-do-i-see'
          && <WhyDoIsee products={products} onClose={this.onCloseWhyDoIsee} />}
        {currentView === 'cards' && this.renderVouchers()}
      </div>
    );
  }
}
