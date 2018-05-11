import PropTypes from 'prop-types';
import React from 'react';
import cliqz from '../cliqz';
import SpeedDial from './speed-dial';
import AddSpeedDial from './add-speed-dial';
import { speedDialClickSignal, speedDialDeleteSignal } from '../services/telemetry/speed-dial';

export default class SpeedDialsRow extends React.Component {

  static get propTypes() {
    return {
      type: PropTypes.string,
      dials: PropTypes.array,
      removeSpeedDial: PropTypes.func,
      addSpeedDial: PropTypes.func,
      getSpeedDials: PropTypes.func,
    };
  }

  constructor(props) {
    super(props);
    this.resetAll = this.resetAll.bind(this);
  }

  componentWillMount() {
    this.state = {
      isCustom: this.props.type === 'custom',
      showAddButton: () => {
        if (!this.state.isCustom) {
          return null;
        }
        return this.state.displayAddBtn();
      },
      displayAddBtn: () => this.props.dials.length < 6,
    };
  }

  removeSpeedDial(dial, index) {
    speedDialDeleteSignal(this.state.isCustom, index);

    this.props.removeSpeedDial(dial, index);
  }

  visitSpeedDial(index) {
    speedDialClickSignal(this.state.isCustom, index);
  }

  resetAll() {
    cliqz.freshtab.resetAllHistory().then(() => {
      this.closeUndo('history');
      this.props.getSpeedDials();
    });

    cliqz.core.sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: 'reset-all-history'
    });
  }

  render() {
    return (
      <div>
        <div className="dials-row">
          {
            this.props.dials.slice(0, 6).map((dial, i) =>
              <SpeedDial
                dial={dial}
                removeSpeedDial={() => this.removeSpeedDial(dial, i)}
                visitSpeedDial={() => this.visitSpeedDial(i)}
              />
            )
          }

          {this.state.showAddButton() &&
            <AddSpeedDial addSpeedDial={this.props.addSpeedDial} />
          }
        </div>
      </div>
    );
  }

}

