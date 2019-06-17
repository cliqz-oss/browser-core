/* eslint-disable jsx-a11y/no-autofocus */
import React from 'react';
import PropTypes from 'prop-types';
import Button from './partials/button';
import Link from './partials/link';
import t from '../i18n';
import cliqz from '../cliqz';
import { messageClickSignal, messagShowSignal } from '../services/telemetry/cliqz-post';

export default class CliqzPost extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      displayTooltip: false
    };

    messagShowSignal(props.messages[0].id);
  }

  handleCloseCliqzPost = (message) => {
    const messageId = message.id;
    const handler = message.handler;
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

  onLater = (message) => {
    const messageId = message.id;
    const handler = message.handler;
    cliqz.freshtab.pauseMessage(messageId, handler);
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

  showTooltip = () => {
    this.setState({ displayTooltip: true });
  }

  hideTooltip = () => {
    this.setState({ displayTooltip: false });
  }

  handleCTAClick = (msg) => {
    messageClickSignal(this.props.messages[0].id);
    this.handleCloseCliqzPost(msg);
  }

  render() {
    const msg = this.props.messages[0];
    const inputClass = msg.icon ? 'standard' : 'basic';

    return (
      <div className={`cliqz-post ${this.props.positioning}`}>
        {this.state.displayTooltip
          && <div className="overlay" />
        }
        <div className={inputClass}>
          {msg.icon
            && (
            <div
              className="image"
              style={{
                backgroundImage: `url(${msg.icon})`
              }}
            />
            )
          }
          <div className="cliqz-post-icon" />
          <div className="content">
            <div className="title">{msg.title}</div>
            {msg.description
              && <div className="article">{msg.description}</div>
            }
            {msg.supplementary_link_url && msg.supplementary_link_text
              && (
                <div className="supplementary-link">
                  <Link
                    href={msg.supplementary_link_url}
                    target="_blank"
                    onClick={() => this.handleCTAClick(msg)}
                    label={msg.supplementary_link_text}
                  >
                    {msg.supplementary_link_text}
                  </Link>
                </div>
              )
            }
            {msg.cta_url
              && (
                <Link
                  href={msg.cta_url}
                  onClick={() => this.handleCTAClick(msg)}
                  label={msg.cta_text}
                  className={`cta-button-${msg.cta_tooltip ? '2' : '1'}`}
                >
                  {msg.cta_text}
                </Link>
              )
            }
          </div>
          {(msg.show_later || msg.cta_tooltip)
            && (
              <div className="footer">
                {msg.show_later
                  && (
                    <Button
                      onClick={() => this.onLater(msg)}
                      className="later"
                      label={t('cliqz_post_remind_later')}
                    />
                  )
                }
                {msg.cta_tooltip
                  && [
                    <span key="tooltip-bubble">
                      {this.state.displayTooltip
                        && <div className="tooltip-bubble post-tooltip">{msg.cta_tooltip}</div>
                      }
                    </span>,
                    <span
                      key="tooltip-wrapper"
                      className="wrapper"
                      onMouseOver={this.showTooltip}
                      onMouseLeave={this.hideTooltip}
                    >
                      <span
                        className="post-info-icon"
                      />
                    </span>
                  ]
                }
              </div>
            )
          }
        </div>
        <Button
          className="close-post"
          onClick={() => this.handleCloseCliqzPost(msg)}
        />
      </div>
    );
  }
}

CliqzPost.propTypes = {
  messages: PropTypes.array
};
