import React from 'react';
import PropTypes from 'prop-types';

class Reload extends React.Component {
  state = {
    isReloadFinished: false,
  }

  reloadExtension = async () => {
    await this.props.cliqz.reloadExtension();
    this.setState({
      isReloadFinished: true,
    });
  }

  render() {
    return (
      <div className={`modal-item ${this.props.modalClass}`}>
        <div className="reload-area">
          <button
            type="button"
            className="reload-button"
            onClick={this.reloadExtension}
            tabIndex="-1"
          >
            RELOAD EXTENSION
          </button>

          {this.state.isReloadFinished
            && (
              <p className="reload-confirmed">Reload finished</p>
            )
          }
        </div>
      </div>
    );
  }
}

Reload.propTypes = {
  cliqz: PropTypes.func.isRequired,
  modalClass: PropTypes.string.isRequired,
};

export default Reload;
