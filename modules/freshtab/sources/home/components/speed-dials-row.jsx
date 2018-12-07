import PropTypes from 'prop-types';
import React from 'react';
import cliqz from '../cliqz';
import SpeedDial from './speed-dial';
import Placeholder from './placeholder';
import AddSpeedDial from './add-speed-dial';
import { speedDialClickSignal, speedDialDeleteSignal } from '../services/telemetry/speed-dial';
import config from '../../config';

export default class SpeedDialsRow extends React.Component {
  static get propTypes() {
    return {
      type: PropTypes.string,
      dials: PropTypes.array,
      removeSpeedDial: PropTypes.func,
      addSpeedDial: PropTypes.func,
      getSpeedDials: PropTypes.func,
      showPlaceholder: PropTypes.bool,
      currentPage: PropTypes.number,
      shouldAnimate: PropTypes.bool,
    };
  }

  constructor(props) {
    super(props);
    this.resetAll = this.resetAll.bind(this);
  }

  showAddButton() {
    if (!this.state.isCustom) {
      return null;
    }
    return this.state.displayAddBtn();
  }

  componentWillMount() {
    this.setState({
      isCustom: this.props.type === 'custom',
      displayAddBtn: () => this.props.dials.length < config.constants.MAX_SPOTS,
    });
  }

  get pageNumber() {
    return this.props.currentPage || 1; // Page number is one-based
  }

  get getDials() {
    return (this.props.dials || []).slice(0, config.constants.MAX_SPOTS * this.pageNumber);
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

  getRealIndex(index) {
    return (config.constants.MAX_SPOTS * (this.pageNumber - 1)) + index;
  }

  render() {
    const placeholdersLength = (config.constants.MAX_SPOTS * this.pageNumber)
                              - this.getDials.length;
    const placeholders = [...Array(placeholdersLength)];

    return (
      <div>
        <div className="dials-row">
          {
            this.getDials
              .slice(config.constants.MAX_SPOTS * (this.pageNumber - 1),
                config.constants.MAX_SPOTS * this.pageNumber)
              .map((dial, i) =>
                (
                  <SpeedDial
                    key={dial.url}
                    dial={dial}
                    removeSpeedDial={() => this.removeSpeedDial(dial, this.getRealIndex(i))}
                    visitSpeedDial={() => this.visitSpeedDial(this.getRealIndex(i))}
                    updateSpeedDial={
                      newDial => this.props.updateSpeedDial(newDial, this.getRealIndex(i))
                    }
                    updateModalState={this.props.updateModalState}
                    shouldAnimate={this.props.shouldAnimate}
                  />
                ))
          }
          {this.props.showPlaceholder
            && placeholders.map((el, ind) => {
              const placeholderKey = `placeholder-${ind}`;
              return (
                <Placeholder
                  key={placeholderKey}
                />
              );
            })
          }
          {this.showAddButton()
            && (
              <AddSpeedDial
                addSpeedDial={this.props.addSpeedDial}
                updateModalState={this.props.updateModalState}
              />
            )
          }
        </div>
      </div>
    );
  }
}
