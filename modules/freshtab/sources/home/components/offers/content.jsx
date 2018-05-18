import React from 'react';
import Title from './title';
import Logo from './logo';
import HeadlineBenefit from './headlineBenefit';
import { tt } from '../../i18n';
import { sendOffersMessage } from '../../services/offers';

const largeBreakpoint = 1600;
const mediumBreakpoint = 1024;
const xMediumBreakpoint = 920;
const smallBreakpoint = 650;

function Label(props) {
  return (
    <span className={props.label}>{tt(`offers_${props.label}`)}</span>
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
      <Label label={label} />
    )
  );
}


export default class Content extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      multiplier: 1.15
    };

    this.didResize = this.didResize.bind(this);
    this.updateLeftContainerWidth = this.updateLeftContainerWidth.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.didResize);
    this.updateLeftContainerWidth(window.innerWidth);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.didResize);
  }

  updateLeftContainerWidth(width) {
    if (width >= largeBreakpoint) {
      this.setState({ multiplier: 0.9 });
    } else if (width >= mediumBreakpoint) {
      this.setState({ multiplier: 1.15 });
    } else if (width >= xMediumBreakpoint) {
      this.setState({ multiplier: 0.8 });
    } else if (width >= smallBreakpoint) {
      this.setState({ multiplier: 1.2 });
    }
  }

  didResize(event) {
    const width = event.target.innerWidth;
    this.updateLeftContainerWidth(width);
  }

  calculateMaxWidth(characters, hasTitle) {
    const multiplier = this.state.multiplier;
    let width = characters * multiplier;
    if (hasTitle) {
      width = characters * 0.82;
    }
    return `${width}%`;
  }

  changeFontSize(characters) {
    let shouldChange = false;
    if (characters > 80) {
      shouldChange = true;
    }
    return shouldChange;
  }

  render() {
    const benefitOrHeadline = (this.props.data.benefit && this.props.data.headline);
    let heading;
    let numOfCharacters;
    let hasTitle = false;
    if (benefitOrHeadline) {
      heading = (<HeadlineBenefit
        headline={this.props.data.headline}
        benefit={this.props.data.benefit}
        color={this.props.data.titleColor}
        url={this.props.data.call_to_action.url}
        offer_id={this.props.offer_id}
      />);
      numOfCharacters = this.props.data.headline.length;
    } else {
      heading = (<Title
        title={this.props.data.title}
        color={this.props.data.titleColor}
        url={this.props.data.call_to_action.url}
        offer_id={this.props.offer_id}
      />);
      numOfCharacters = this.props.data.title.length;
      hasTitle = true;
    }
    return (
      <div className="content clearfix">
        <div
          className="left-container"
          style={{
            width: this.calculateMaxWidth(numOfCharacters, hasTitle)
          }}
        >
          <div className="special-flags">
            <SpecialFlags labels={this.props.data.labels} />
          </div>
          {heading}
        </div>
        <div className="right-container">
          <div className="top-row">

            <div className={`logo-container ${this.props.data.logo_class}`}>
              <Logo
                data={this.props.data}
                offer_id={this.props.offer_id}
                url={this.props.data.call_to_action.url}
              />
            </div>
            <span
              className={`expires ${((this.props.validity && this.props.validity.isExpiredSoon) ? 'red' : '')}`}
            >
              {this.props.validity.text}
            </span>
          </div>
          <p
            className={`offer-description ${((this.changeFontSize(this.props.data.desc.length)) ? 'small' : '')}`}
          >
            <a
              href={this.props.data.call_to_action.url}
              // data-tip={props.data.desc}
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
