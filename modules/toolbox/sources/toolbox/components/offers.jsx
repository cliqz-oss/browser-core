import React from 'react';
import PropTypes from 'prop-types';

import OffersRow from './partials/offers-row';
import RefreshState from './partials/refresh-state';

class Offers extends React.Component {
  state = {
    offersStatus: {
      activeCategories: {},
      activeIntents: {},
      activeOffers: {},
      activeRealEstates: [],
      categories: [],
      initialized: false,
      triggerCache: {},
    },
  }

  componentDidMount() {
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.props.cliqz.getOffersState();
    this.setState(newState);
  }

  render() {
    return (
      <div>
        <table className="bordered-table">
          <tbody>
            <RefreshState syncState={this.syncState} />

            <tr>
              <th colSpan="2">
                Backend state
              </th>
            </tr>
            <OffersRow
              title="Categories evaluated"
              values={this.state.offersStatus.categories}
            />

            <OffersRow
              title="Triggers"
              values={this.state.offersStatus.triggerCache}
            />

            <tr>
              <th colSpan="2">
                Active state
              </th>
            </tr>
            <OffersRow
              title="Initialized"
              values={this.state.offersStatus.initialized}
            />
            <OffersRow
              title="Active real estates"
              values={this.state.offersStatus.activeRealEstates}
            />
            <OffersRow
              title="Active categories"
              values={this.state.offersStatus.activeCategories}
            />
            <OffersRow
              title="Active intents"
              values={this.state.offersStatus.activeIntents}
            />
            <OffersRow
              title="Active offers"
              values={this.state.offersStatus.activeOffers}
            />
          </tbody>
        </table>
      </div>
    );
  }
}

Offers.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default Offers;
