import React from 'react';
import PropTypes from 'prop-types';
import Button from './partials/button';

class ActionButtons extends React.Component {
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
      <div className="button-area">
        <Button
          onClick={this.reloadExtension}
          value="RELOAD EXTENSION"
        />

        {this.state.isReloadFinished
          && (
            <p className="reload-confirmed">Reload finished</p>
          )
        }
      </div>
    );
  }
}

ActionButtons.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default ActionButtons;
