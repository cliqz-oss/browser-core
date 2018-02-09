import React from 'react';
import PropTypes from 'prop-types';
import cliqz from '../cliqz';

export default class TopMessages extends React.Component {

  handleClose(id, handler) {
    cliqz.freshtab.dismissMessage(id, handler);
    cliqz.storage.setState((prevState) => {
      const prev = prevState;
      delete prev.messages[id];
      return {
        messages: prev.messages
      };
    });
  }

  render() {
    return (
      <div id="notificationsBox">
        {
          this.props.messages.map((message, i) =>
            <div className="notificationsCon clearfix" key={i}>
              <div className="close">
                <button
                  href="#"
                  onClick={this.handleClose(message.id, message.handler)}
                >
                  <img
                    role="presentation"
                    src="./close_icon.svg"
                  />
                </button>
              </div>
              <img
                className="logo"
                width="40px"
                role="presentation"
                src="./new-cliqz.png"
              />
              <div className="text">
                <h1>{message.title}</h1>
                <p>{message.description}</p>
              </div>
            </div>
          )
        }
      </div>

    );
  }
}

TopMessages.propTypes = {
  messages: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    map: PropTypes.func
  })
};
