import React from 'react';
import PropTypes from 'prop-types';

import Button from './partials/button';
import Row from './partials/row';

class ActionButtons extends React.Component {
  state = {
    isExtReloadFinished: false,
    isOffersReloadFinished: false,
  }

  reloadExtension = async () => {
    await this.props.cliqz.reloadExtension();
    this.setState({
      isExtReloadFinished: true,
    });
  }

  reloadOffers = async () => {
    await this.props.cliqz.reloadOffers();
    this.setState({
      isOffersReloadFinished: true,
    });
  }

  render() {
    return (
      <table>
        <tbody>
          <Row>
            <Button
              onClick={this.reloadExtension}
              value="RELOAD EXTENSION"
            />
          </Row>

          <Row>
            <Button
              onClick={this.reloadOffers}
              value="RELOAD OFFERS"
            />
          </Row>

          {(this.state.isExtReloadFinished
            || this.state.isOffersReloadFinished)
          && (
            <Row>Reload finished</Row>
          )
        }
        </tbody>
      </table>
    );
  }
}

ActionButtons.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default ActionButtons;
