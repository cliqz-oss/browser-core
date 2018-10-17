import React from 'react';
import PropTypes from 'prop-types';
import TopMessages from './top-messages';
import MiddleMessages from './middle-messages';
import OfferMiddleMessages from './middle-messages-offers';

export default class MessageCenter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      top: [],
      middle: [],
      offers: [],
    };
  }

  componentWillReceiveProps(nextProps) {
    const messages = nextProps.messages;
    const top = [];
    const middle = [];
    const offers = [];
    Object.keys(messages).forEach((message) => {
      const msg = messages[message];
      const { position, type } = msg;

      if (position === 'top') {
        top.push(msg);
      } else if (position === 'middle') {
        if (type === 'offer') {
          offers.push(msg);
        } else {
          middle.push(msg);
        }
      }
    });
    this.setState({
      top,
      middle,
      offers,
    });
  }

  render() {
    const position = this.props.position;
    if (position === 'top' && this.state.top.length > 0) {
      return (
        <TopMessages
          messages={this.state.top}
          handleLinkClick={this.props.handleLinkClick}
        />
      );
    } else if (position === 'middle' && this.state.middle.length > 0 && this.state.offers.length <= 0) {
      return (
        <MiddleMessages
          messages={this.state.middle}
          settingsIcon={this.props.settingsElem}
          handleLinkClick={this.props.handleLinkClick}
          locale={this.props.locale}
        />
      );
    } else if (position === 'middle' && this.state.offers.length > 0) {
      return (
        <OfferMiddleMessages
          offers={this.state.offers}
          fullWidth={this.props.fullWidth}
          submitFeedbackForm={this.props.submitFeedbackForm}
          getOfferInfoOpen={this.props.getOfferInfoOpen}
          setOfferInfoOpen={this.props.setOfferInfoOpen}
          getOfferMenuOpen={this.props.getOfferMenuOpen}
          setOfferMenuOpen={this.props.setOfferMenuOpen}
        />
      );
    }
    return null;
  }
}

MessageCenter.propTypes = {
  position: PropTypes.string,
  settingsElem: PropTypes.string,
  handleLinkClick: PropTypes.func
};

