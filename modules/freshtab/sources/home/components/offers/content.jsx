import React from 'react';
import Title from './title';
import Logo from './logo';
import HeadlineBenefit from './headlineBenefit';
import AppContext from '../app-context';
import { tt } from '../../i18n';
import { sendOffersMessage } from '../../services/offers';
import { offerClickSignal } from '../../services/telemetry/offers';
import config from '../../../config';
import Button from '../partials/button';

function Label(props) {
  return (
    <li className={props.label}>{tt(`offers_${props.label}`)}</li>
  );
}

function SpecialFlags(props) {
  const labels = props.labels || [];
  const weeklyOffer = labels.indexOf('offer_of_the_week') > -1;
  const bestOffer = labels.indexOf('best_offer') > -1;
  const exclusive = labels.indexOf('exclusive') > -1;
  // Show only Weekly offer if is both weekly offer & best_offer and not exclusive
  if (labels && weeklyOffer && bestOffer && !exclusive) {
    return (
      <Label label="offer_of_the_week" />
    );
  }
  return labels && labels.slice(0, 2).map(label =>
    (
      <Label label={label} key={label} />
    ));
}

export default class Content extends React.Component {
  onLearnMoreClicked = () => {
    offerClickSignal('learn_more');
  }

  changeFontSize(characters) {
    let shouldChange = false;
    if (characters > 80) {
      shouldChange = true;
    }
    return shouldChange;
  }

  handletoggleMenu = (e) => {
    e.stopPropagation();
    offerClickSignal('menu');
    this.props.setOfferMenuOpen(!this.props.getOfferMenuOpen());
  }

  closeWhyInfo = () => {
    this.props.setOfferInfoOpen(!this.props.getOfferInfoOpen());
  }

  handleCloseClick = () => {
    const offerId = this.props.offer_id;
    this.props.toggleComponents();
    sendOffersMessage(offerId, 'offer_removed', 'remove-offer');
    offerClickSignal('remove');
  }

  showInfo = () => {
    offerClickSignal('why_see');
    this.props.setOfferInfoOpen(!this.props.getOfferInfoOpen());
  }

  render() {
    const benefitOrHeadline = (this.props.data.benefit && this.props.data.headline);
    let heading;
    if (benefitOrHeadline) {
      heading = (
        <HeadlineBenefit
          headline={this.props.data.headline}
          benefit={this.props.data.benefit}
          color={this.props.data.titleColor}
          url={this.props.data.call_to_action.url}
          offer_id={this.props.offer_id}
        />);
    } else {
      heading = (
        <Title
          title={this.props.data.title}
          color={this.props.data.titleColor}
          url={this.props.data.call_to_action.url}
          offer_id={this.props.offer_id}
        />);
    }
    return (
      <div className="row">
        <div className="col first">
          <div className="first-holder">
            <div className="special-flags">
              <header>
                <ul>
                  <SpecialFlags labels={this.props.data.labels} />
                </ul>
              </header>
            </div>
            {heading}
          </div>
        </div>
        <div className="col second">
          <header>
            <ul>
              <li
                className={`expires day-icon tooltip tooltipstered ${this.props.validity && this.props.validity.isExpiredSoon ? 'red' : ''}`}
                ref={(el) => { this.tooltip = el; }}
                data-tip={this.props.validity.text}
              >
                {this.props.validity.text}
              </li>
            </ul>
            <span className={`logo ${this.props.data.logo_class}`}>
              <Logo
                data={this.props.data}
                offer_id={this.props.offer_id}
                url={this.props.data.call_to_action.url}
              />
            </span>
            <Button
              className="options"
              onClick={this.handletoggleMenu}
            />
            <ul className={`offer-menu white-box ${this.props.getOfferMenuOpen() ? 'show-it' : ''}`}>

              <li>
                <Button
                  label={tt('delete')}
                  onClick={this.handleCloseClick}
                />
              </li>
              <li>
                <Button
                  label={tt('why_offers')}
                  onClick={this.showInfo}
                />
              </li>
            </ul>
            <div className={`why-info white-box ${this.props.getOfferInfoOpen() ? 'show-it' : ''}`}>
              <Button
                className="close"
                onClick={this.closeWhyInfo}
              />
              <p>
                {' '}
                {tt('why_offers_text')}
                {' '}
              </p>
              <AppContext.Consumer>
                {
                  ({ config: appConfig }) => (
                    <a
                      onClick={this.onLearnMoreClicked}
                      href={config.constants.WHY_OFFERS_URL[appConfig.product]}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {tt('learnMore')}
                    </a>
                  )
                }
              </AppContext.Consumer>
            </div>
          </header>
          <p
            className={`offer-description ${((this.changeFontSize(this.props.data.desc.length)) ? 'small' : '')}`}
          >
            <a
              href={this.props.data.call_to_action.url}
              rel="noreferrer noopener"
              target="_blank"
              data-type="light"
              data-class="light-tooltip"
              onClick={() => {
                sendOffersMessage(this.props.offer_id, 'offer_ca_action');
                sendOffersMessage(this.props.offer_id, 'offer_description');
              }}
            >
              {this.props.data.desc}
            </a>
          </p>
        </div>
      </div>
    );
  }
}
