import React from 'react';
import cliqz from '../cliqz';
import { messageShowSignal, messageClickSignal, messageCloseSignal } from '../services/telemetry/worldcup';

export default class Tooltip extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: true,
      isDissmissed: false
    };
  }

  componentDidMount() {
    const messageId = this.props.id;
    messageShowSignal(messageId);
  }

  handleCTAClick() {
    const id = this.props.id;
    const btnId = this.props.mainBtn.id;
    const url = this.props.mainBtn.url;
    messageClickSignal(`${id}.${btnId}`);
    cliqz.freshtab.saveMessageDismission({ id: `worldcup-${id}` });
    window.location = url;
  }

  handleCloseClick() {
    const id = this.props.id;
    messageCloseSignal(`${id}.close`);
    cliqz.freshtab.saveMessageDismission({ id: `worldcup-${id}` });
    this.setState({
      isOpen: false
    });
  }

  render() {
    return (
      <div
        role="presentation"
        className={`tooltip ${this.state.isOpen ? '' : 'close'}`}
        onClick={(event) => { event.stopPropagation(); event.preventDefault(); }}
      >
        <div className="row">
          <aside className="tooltip-icon">
            <img src="./images/soccer-icon.svg" alt="soccer icon" />
          </aside>
          <div className="tooltip-content">
            <h1>{this.props.title}</h1>
            <p>{this.props.description}</p>
            <button
              className="explore"
              onClick={() => this.handleCTAClick()}
            >
              {this.props.mainBtn.text}
            </button>
            <button
              className="later"
              onClick={this.props.secondaryBtn.onClick}
            >
              {this.props.secondaryBtn.text}
            </button>
          </div>
          <aside className="tooltip-close">
            <button onClick={() => this.handleCloseClick()}>X</button>
          </aside>
        </div>
      </div>
    );
  }
}
