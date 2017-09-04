import { AppRegistry } from 'react-native';
import startup from './modules/platform/startup';
import components from './components';

// set app global for debugging
startup.then((app) => {
  global.app = app;
});

// register components from config
Object.keys(components).forEach((component) => {
  AppRegistry.registerComponent(component, () => components[component]);
});
