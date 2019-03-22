import React from 'react';
import PropTypes from 'prop-types';

import Button from './partials/button';
import Row from './partials/row';

class ResourceLoaders extends React.Component {
  state = {
    RLStatus: [],
  }

  componentDidMount() {
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.props.cliqz.getResourceLoadersState();
    this.setState(newState);
  }

  updateLoader = async (loader) => {
    await this.props.cliqz.updateFromRemote(loader);
    const loaders = await this.props.cliqz.getResourceLoaders();
    this.setState({ RLStatus: loaders });
  }

  render() {
    return (
      <div>
        <table>
          <tbody>
            <tr>
              <th>loader</th>
              <th>remote url</th>
              <th>size</th>
              <th>last update</th>
              <th>update</th>
            </tr>
            {this.state.RLStatus.map(loader => (
              <Row
                key={loader.resource.name.toString()}
              >
                {loader.resource.name.join(' ')}
                {loader.resource.remoteURL}
                {loader.resource.size}
                {loader.lastUpdate.toString()}
                <Button
                  onClick={() => this.updateLoader(loader)}
                  value="update"
                />
              </Row>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

ResourceLoaders.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default ResourceLoaders;
