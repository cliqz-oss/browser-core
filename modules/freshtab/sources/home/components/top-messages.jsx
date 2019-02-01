import React from 'react';
import PropTypes from 'prop-types';
import cliqz from '../cliqz';
import Button from './partials/button';
import { messageShowSignal, messageClickSignal, messageCloseSignal, messageSkipSignal } from '../services/telemetry/top-messages';

export default class TopMessages extends React.Component {
  componentDidMount() {
    if (this.props.messages.length > 0) {
      // Send show signal for the visible message (i.e the first one)
      const message = this.props.messages[0];
      messageShowSignal(message.id);
    }
  }

  handleCTAClick(message) {
    messageClickSignal(message.id);
    cliqz.freshtab.countMessageClick(message);
    this.container.classList.add('removing');
    setTimeout(() => {
      cliqz.freshtab.dismissMessage(message.id, message.handler);
      this.props.handleLinkClick(message);
    }, 500);
  }

  handleLaterClick(message) {
    messageSkipSignal(message.id);
    cliqz.freshtab.skipMessage(message);
    this.container.remove();
  }

  handleCloseClick(message) {
    const messageId = message.id;
    const handler = message.handler;
    messageCloseSignal(messageId);
    cliqz.freshtab.dismissMessage(messageId, handler);
    cliqz.storage.setState((prevState) => {
      const prev = prevState;
      const messages = {
        ...prev.messages,
      };
      delete messages[messageId];
      return {
        messages,
      };
    });
  }

  render() {
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div id="topNotificationBox" ref={(div) => { this.container = div; }}>
        {
          this.props.messages.map(message =>
            (
              <div
                key={message.id}
                className={`top-notification-box ${message.type}`}
              >
                <div
                  className="close"
                  onClick={() => this.handleCloseClick(message)}
                />
                <div className="content">
                  <div>
                    <h1
                      title={message.title}
                      style={{
                        backgroundImage: `url(${message.icon})`,
                        paddingLeft: message.icon ? '40px' : '0px'
                      }}
                    >
                      {message.title}
                    </h1>
                  </div>
                  <div>
                    <Button
                      className="cta-btn"
                      label={message.cta_text}
                      onClick={() => this.handleCTAClick(message)}
                    />
                    {message.later_text
                      && (
                        <Button
                          className="later-btn"
                          label={message.later_text}
                          onClick={() => this.handleLaterClick(message)}
                        />)
                    }
                  </div>
                </div>
              </div>))
        }
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}

TopMessages.propTypes = {
  handleLinkClick: PropTypes.func,
  messages: PropTypes.array,
};
