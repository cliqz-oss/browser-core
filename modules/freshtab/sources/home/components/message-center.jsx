import React from 'react';
import PropTypes from 'prop-types';
import TopMessages from './top-messages';
import MiddleMessages from './middle-messages';

export default class MessageCenter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      top: [],
      middle: []
    };
  }

  componentWillReceiveProps(nextProps) {
    const messages = nextProps.messages;
    const top = [];
    const middle = [];
    Object.keys(messages).forEach((message) => {
      if (messages[message].position === 'top') {
        top.push(messages[message]);
      } else {
        middle.push(messages[message]);
      }
    });

    this.setState({
      top,
      middle
    });
  }

  render() {
    const position = this.props.position;
    if (position === 'top' && this.state.top.length > 0) {
      return <TopMessages messages={this.state.top} />;
    } else if (position === 'middle' && this.state.middle.length > 0) {
      return (
        <MiddleMessages
          messages={this.state.middle}
          settingsIcon={this.props.settingsElem}
          handleLinkClick={this.props.handleLinkClick}
          locale={this.props.locale}
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

