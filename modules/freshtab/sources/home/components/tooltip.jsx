import React from 'react';
import PropTypes from 'prop-types';
import cliqz from '../cliqz';
import { notificationShowSignal, clickSignal } from '../services/telemetry/blackfriday';

export default class Tooltip extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: true,
    };
  }

  componentDidMount() {
    notificationShowSignal();
    cliqz.freshtab.markTooltipRendered(this.props.id);
  }

  handleCTAClick() {
    clickSignal({ target: 'notification' });
    cliqz.freshtab.saveMessageDismission({ id: `${this.props.id}` });
    window.location = this.props.urlToOpen;
  }

  handleSkipClick() {
    if (!this.state.isOpen) {
      return;
    }

    this.tooltip.classList.add('removing');
    setTimeout(() => {
      this.tooltip.style.display = 'none';
      cliqz.freshtab.markTooltipAsSkipped();
      this.setState({
        isOpen: false,
      });
    }, 500);
  }

  render() {
    return (
      <div
        role="presentation"
        className={`tooltip ${this.props.eventType} ${this.state.isOpen ? '' : 'close'}`}
        onClick={() => this.handleCTAClick()}
        ref={(div) => { this.tooltip = div; }}
      >
        <div className="tooltip-content">
          {this.props.description}
        </div>
      </div>
    );
  }
}

Tooltip.propTypes = {
  id: PropTypes.string,
  eventType: PropTypes.string,
  description: PropTypes.string,
  urlToOpen: PropTypes.string,
};
