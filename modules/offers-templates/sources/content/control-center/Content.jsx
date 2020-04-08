import React from 'react';
import Badge from './Badge';
import Card from './Card';
import Feedback from './Feedback';
import WhyDoIsee from './WhyDoIsee';
import OptIn from './OptIn';
import Onboarding from './Onboarding';
import Empty from './Empty';
import GroupHeader from './GroupHeader';
import { uniqueIndexes, groupBy } from './algorithms';
import send from '../transport';
import { css, chooseProduct } from '../utils';

const _css = css('content__');
export default class Content extends React.Component {
  constructor(props) {
    super(props);
    const cards = {};
    const { vouchers, shouldShowOnboarding, autoTrigger } = props;
    vouchers.forEach((voucher) => {
      const { template_data: templateData = {} } = voucher;
      cards[voucher.offer_id] = {
        isCodeHidden: voucher.isCodeHidden,
        status: 'active',
        logoDataurl: templateData.logo_dataurl,
      };
    });
    const voucher = vouchers[0] || {};
    const activeCard = (!shouldShowOnboarding || autoTrigger) && voucher.offer_id;
    this.state = {
      activeCard,
      cards,
      shouldShowOnboarding,
    };
  }

  componentDidMount() {
    const { vouchers, onChangeSeenOffers } = this.props;
    const { activeCard } = this.state;
    if (!activeCard) { return; }
    const voucher = vouchers.find(v => v.offer_id === activeCard);
    const subgroup = vouchers.filter(v => v.group === voucher.group);
    // subgroup.length < 4, in average equal two
    subgroup.forEach(v => send('seenOffer', { offer_id: v.offer_id }));
    onChangeSeenOffers(subgroup.map(v => v.offer_id));
  }

  onLoadLogo = offerId => (dataurl) => {
    const { cards } = this.state;
    cards[offerId].logoDataurl = dataurl;
    this.setState({ cards });
  }

  onClickActiveGroupHeader = () =>
    this.setState({ activeCard: undefined }, window.__globals_resize)

  onClickBadge = (offerId, subgroup) => () => {
    this.setState({ activeCard: offerId }, window.__globals_resize);
    subgroup.forEach((v) => { // v.length < 4, in average equal two
      send('sendOfferActionSignal', {
        signal_type: 'offer-action-signal',
        element_id: 'offer_expanded',
        offer_id: v.offer_id,
      });
      send('seenOffer', { offer_id: v.offer_id });
    });
    this.props.onChangeSeenOffers(subgroup.map(v => v.offer_id));
  }

  onRemoveCard = offerId => () => {
    const { cards } = this.state;
    cards[offerId].status = 'in-feedback';
    this.setState({ cards, activeCard: offerId }, window.__globals_resize);
    send('sendOfferActionSignal', {
      signal_type: 'remove-offer',
      element_id: 'offer_removed',
      offer_id: offerId,
    });
  }

  onChangeCodeStatus = offerId => () => {
    const { cards } = this.state;
    if (cards[offerId].isCodeHidden === false) { return; }
    cards[offerId].isCodeHidden = false;
    this.setState({ cards });
  }

  onChangeFeedback = (groupId, offerId, action) => ({ text, vote }) => {
    const { cards } = this.state;
    const { vouchers } = this.props;

    cards[offerId].status = 'deleted';
    const groupPred = v => cards[v.offer_id].status === 'active' && v.group === groupId;
    const activePred = v => cards[v.offer_id].status === 'active';
    const card = vouchers.find(groupPred) || vouchers.find(activePred) || {};

    this.setState({ cards, activeCard: card.offer_id }, window.__globals_resize);
    const message = {
      comments: text,
      vote: action === 'skip' ? undefined : (vote || 'other'),
      offer_id: offerId,
    };
    send('sendUserFeedback', { ...message, target: 'remove_offer' });
  }

  onCloseWhyDoIsee = () => this.props.onChangeView('cards');

  onClickOptIn = (option) => {
    if (option === 'no') {
      send('setOptInResult', { optin: false });
      send('myOffrzTurnoff');
      send('hideBanner');
    } else {
      send('setOptInResult', { optin: true });
      this.props.onChangeView('cards');
    }
  }

  renderFeedback(groupId, voucher) {
    const { products } = this.props;
    const offerId = voucher.offer_id;
    return (
      <Feedback
        voucher={voucher}
        products={products}
        onChange={this.onChangeFeedback(groupId, offerId, 'send')}
        onSkip={this.onChangeFeedback(groupId, offerId, 'skip')}
      />
    );
  }

  renderActiveCard = (voucher, i) => {
    const { products, autoTrigger } = this.props;
    const { cards } = this.state;
    const offerId = voucher.offer_id;
    const groupId = voucher.group;
    const cardStatus = cards[offerId].status;
    return (
      <React.Fragment key={voucher.offer_id}>
        {cardStatus === 'in-feedback' && this.renderFeedback(groupId, voucher, i)}
        {cardStatus === 'active' && (
        <Card
          products={products}
          onRemove={this.onRemoveCard(offerId)}
          onChangeCodeStatus={this.onChangeCodeStatus(offerId)}
          key={offerId + String(cardStatus)}
          isCodeHidden={cards[offerId].isCodeHidden}
          voucher={voucher}
          autoTrigger={autoTrigger}
        />
        )}
      </React.Fragment>
    );
  }

  renderBadge = (voucher, subgroup) => {
    const { products, autoTrigger } = this.props;
    const { cards } = this.state;
    const offerId = voucher.offer_id;
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div
        key={voucher.offer_id}
        onClick={this.onClickBadge(voucher.offer_id, subgroup)}
      >
        <Badge
          logoDataurl={cards[offerId].logoDataurl}
          onLoadLogo={this.onLoadLogo(offerId)}
          key={offerId}
          voucher={voucher}
          notification={subgroup.length}
          products={products}
          autoTrigger={autoTrigger}
        />
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderEmpty() {
    const { products, autoTrigger } = this.props;
    if (products.ghostery) { return null; }
    return (
      <Empty products={products} autoTrigger={autoTrigger} />
    );
  }

  renderOnboarding() {
    const { products, vouchers } = this.props;
    const { activeCard, cards } = this.state;
    return (
      <Onboarding
        onHide={() => {
          const getActiveCard = () =>
            vouchers.find(v => cards[v.offer_id].status === 'active') || {};
          const newActiveCard = activeCard || getActiveCard().offer_id;
          this.setState({
            shouldShowOnboarding: false,
            activeCard: newActiveCard,
          }, window.__globals_resize);
        }}
        products={products}
      />
    );
  }

  renderActiveGroup(leader, subgroup) {
    const { cards } = this.state;
    const { products, autoTrigger, vouchers } = this.props;
    const shouldShowNotification = autoTrigger
      && (products.chip || products.myoffrz)
      && vouchers.filter(v => cards[v.offer_id].status === 'active').length > 1;
    const offerId = leader.offer_id;
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <React.Fragment key={offerId}>
        <div
          className={_css('group-header')}
          onClick={this.onClickActiveGroupHeader}
        >
          <GroupHeader
            logoDataurl={cards[offerId].logoDataurl}
            onLoadLogo={this.onLoadLogo(offerId)}
            key={`${leader.offer_id}group-header`}
            voucher={leader}
            notification={shouldShowNotification && subgroup.length}
            products={products}
          />
        </div>
        <div key={`${leader.offer_id}_top`} style={{ height: '7px' }} />
        {subgroup.map(this.renderActiveCard)}
        <div key={`${leader.offer_id}_bottom`} style={{ height: '7px' }} />
      </React.Fragment>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderGroup = (leader, subgroup) => {
    const { activeCard } = this.state;
    const isActiveGroup = subgroup.map(v => v.offer_id).includes(activeCard);
    return isActiveGroup
      ? this.renderActiveGroup(leader, subgroup)
      : this.renderBadge(leader, subgroup);
  }

  renderVouchersGrouped = (vouchers) => {
    const indexes = uniqueIndexes(vouchers, elem => elem.group);
    const subgroups = groupBy(vouchers, elem => elem.group);
    return indexes.map(i => this.renderGroup(vouchers[i], subgroups[vouchers[i].group]));
  }

  renderVouchers = () => {
    const { vouchers } = this.props;
    const { activeCard, cards, shouldShowOnboarding } = this.state;
    const activeVouchers = vouchers.filter((voucher) => {
      const cardStatus = cards[voucher.offer_id].status;
      return cardStatus === 'active'
        || (cardStatus === 'in-feedback' && activeCard === voucher.offer_id);
    });
    if (activeVouchers.length === 0) { return this.renderEmpty(); }
    return (
      <React.Fragment>
        { shouldShowOnboarding && this.renderOnboarding() }
        { this.renderVouchersGrouped(activeVouchers) }
      </React.Fragment>
    );
  }

  render() {
    const { currentView, products, autoTrigger } = this.props;
    const product = chooseProduct(products);
    const triggerCls = `${autoTrigger ? 'auto' : 'normal'}-trigger-size`;
    return (
      <div className={_css('size', `${product}-size`, triggerCls)}>
        {currentView === 'why-do-i-see'
          && <WhyDoIsee products={products} onClose={this.onCloseWhyDoIsee} />}
        {currentView === 'opt-in' && <OptIn onClick={this.onClickOptIn} />}
        {currentView === 'cards' && this.renderVouchers()}
      </div>
    );
  }
}
