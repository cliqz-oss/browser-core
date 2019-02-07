import React from 'react';
import PropTypes from 'prop-types';
import Button from './partials/button';
import t from '../i18n';

class UndoDialRemoval extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.visible !== this.state.visible) {
      this.setState({ visible: nextProps.visible });
    }
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
      <div className={classes.join(' ')}>
        <span
          className="removed-dial"
        >
          {this.props.dial.displayTitle}
        </span>&nbsp;
        {t('app_speed_dial_removed')}
        <Button
          className="undo"
          id="undo-close"
          label={t('app_speed_dial_undo')}
          onClick={() => this.handleUndoRemoval()}
        />
        <Button
          className="close"
          id="undo-notification-close"
          label="X"
          onClick={() => this.handleUndoClose()}
        />
      </div>
    );
  }
}

UndoDialRemoval.propTypes = {
  closeUndo: PropTypes.func,
  dial: PropTypes.shape({
    displayTitle: PropTypes.string
  }),
  isSettingsOpen: PropTypes.bool,
  undoRemoval: PropTypes.func,
  visible: PropTypes.bool,
};

export default UndoDialRemoval;
