import { AppRegistry } from 'react-native';
import MobileCards from './MobileCards';
import { window } from '../platform/globals';

const root = window.document.getElementById('root');

AppRegistry.registerComponent('MobileCards', () => MobileCards);

AppRegistry.runApplication('MobileCards', {
  initialProps: {
  },
  rootTag: root
});
