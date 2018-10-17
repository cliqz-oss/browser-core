import { AppRegistry } from 'react-native';
import FixturesList from './debug/FixturesList';
import MobileCards from './MobileCards';
import { window } from '../platform/globals';

AppRegistry.registerComponent('FixturesList', () => FixturesList);
AppRegistry.registerComponent('MobileCards', () => MobileCards);

const modes = {
  live: () => {
    AppRegistry.runApplication('MobileCards', {
      initialProps: {
      },
      rootTag: document.getElementById('root')
    });
  },

  fixtures: () => {
    AppRegistry.runApplication('FixturesList', {
      initialProps: {},
      rootTag: document.getElementById('root')
    });
  },
};

window.addEventListener('load', () => modes.live());
