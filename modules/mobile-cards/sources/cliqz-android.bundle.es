/* global window, document */
import { AppRegistry } from 'react-native';
import MobileCards from './MobileCards';

AppRegistry.registerComponent('MobileCards', () => MobileCards);

AppRegistry.runApplication('MobileCards', {
  initialProps: {
  },
  rootTag: document.getElementById('root')
});
