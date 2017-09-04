import React from 'react';
import PropTypes from 'prop-types';
import t from '../i18n';

function UndoDialRemoval(props) {
  return (
    <div className="undo-notification-box">
      <span
        className="removed-dial"
      >
        {props.dial.displayTitle}
      </span>&nbsp;
      {t('app.speed-dial.removed')}
      <button
        className="undo"
        onClick={props.undoRemoval}
      >
        {t('app.speed-dial.undo')}
      </button>
      <button
        className="close"
        onClick={props.closeUndo}
      >
        X
      </button>
    </div>
  );
}

UndoDialRemoval.propTypes = {
  dial: PropTypes.shape({
    displayTitle: PropTypes.string
  }),
  undoRemoval: PropTypes.func,
  closeUndo: PropTypes.func,
};

export default UndoDialRemoval;
