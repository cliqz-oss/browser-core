import React from 'react';
import PropTypes from 'prop-types';
import t from '../i18n';

class UndoDialRemoval extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
    };
  }

  handleUndoRemoval() {
    this.setState({ visible: false });
    this.props.undoRemoval();
  }

  handleUndoClose() {
    this.setState({ visible: false });
    this.props.closeUndo();
  }

  render() {
    const classes = ['undo-notification-box'];
    if (this.props.isSettingsOpen) {
      classes.push('padded');
    }
    if (this.props.visible) {
      classes.push('visible');
    }

    return (
      <div className={classes.join(' ')} >
        <span
          className="removed-dial"
        >
          {this.props.dial.displayTitle}
        </span>&nbsp;
        {t('app_speed_dial_removed')}
        <button
          id="undo-close"
          className="undo"
          tabIndex="-1"
          onClick={() => this.handleUndoRemoval()}
        >
          {t('app_speed_dial_undo')}
        </button>
        <button
          id="undo-notification-close"
          className="close"
          tabIndex="-1"
          onClick={() => this.handleUndoClose()}
        >
          X
        </button>
      </div>
    );
  }
}

UndoDialRemoval.propTypes = {
  dial: PropTypes.shape({
    displayTitle: PropTypes.string
  }),
  undoRemoval: PropTypes.func,
  closeUndo: PropTypes.func,
  isSettingsOpen: PropTypes.func,
};

export default UndoDialRemoval;
