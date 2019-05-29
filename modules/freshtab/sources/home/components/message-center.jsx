import React from 'react';
import PropTypes from 'prop-types';
import TopMessages from './top-messages';
import MiddleMessages from './middle-messages';
import OfferMiddleMessages from './middle-messages-offers';
import CliqzPost from './cliqz-post';

export default class MessageCenter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      top: [],
      middle: [],
      cliqzpost: [],
      offers: [],
    };
  }

  componentWillReceiveProps(nextProps) {
    const messages = nextProps.messages;
    const top = [];
    const middle = [];
    const offers = [];
    const cliqzpost = [];
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
      } else if (position === 'post') {
        cliqzpost.push(msg);
      }
    });

    this.setState({
      top,
      middle,
      cliqzpost,
      offers,
    });
  }

  render() {
    const position = this.props.position;
    if (position === 'top' && this.state.top.length > 0) {
      return (
        <TopMessages
          handleLinkClick={this.props.handleLinkClick}
          messages={this.state.top}
        />
      );
    }
    if (position === 'middle' && this.state.middle.length > 0 && this.state.offers.length <= 0) {
      return (
        <MiddleMessages
          handleLinkClick={this.props.handleLinkClick}
          locale={this.props.locale}
          messages={this.state.middle}
        />
      );
    }
    if (position === 'middle' && this.state.offers.length > 0) {
      return (
        <OfferMiddleMessages
          fullWidth={this.props.fullWidth}
          getOfferInfoOpen={this.props.getOfferInfoOpen}
          getOfferMenuOpen={this.props.getOfferMenuOpen}
          offers={this.state.offers}
          setOfferInfoOpen={this.props.setOfferInfoOpen}
          setOfferMenuOpen={this.props.setOfferMenuOpen}
          submitFeedbackForm={this.props.submitFeedbackForm}
        />
      );
    }
    if (position === 'post' && this.state.cliqzpost.length > 0) {
      return (
        <CliqzPost
          positioning={this.props.positioning}
          messages={this.state.cliqzpost}
        />
      );
    }
    return null;
  }
}

MessageCenter.propTypes = {
  handleLinkClick: PropTypes.func,
  locale: PropTypes.string,
  messages: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    map: PropTypes.func
  }),
  position: PropTypes.string,
};
