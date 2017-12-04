import { AppRegistry } from 'react-native';
import FixturesList from './debug/FixturesList';
import SearchUI from './SearchUI';
import App from '../core/app';
import console from '../core/console';
import osAPI from '../platform/os-api';

// mocking the OS API
osAPI.OS.postMessage = (...args) => {
  console.log('osAPI postMessage', ...args);
};

AppRegistry.registerComponent('FixturesList', () => FixturesList);
AppRegistry.registerComponent('SearchUI', () => SearchUI);

const modes = {
  live: (app) => {
    const queryParams = new URLSearchParams(window.location.search)
    const queries = queryParams.getAll('query');
    const query = queries[queries.length - 1] || '';

    app.start().then(() => {
      AppRegistry.runApplication('SearchUI', {
        initialProps: {
          query,
        },
        rootTag: document.getElementById('root')
      });
    });
  },

  fixtures: (app) => {
    app.start().then(() => {
      AppRegistry.runApplication('FixturesList', {
        initialProps: {},
        rootTag: document.getElementById('root')
      });
    });
  },
};

window.startDebug = (mode) => {
  const app = new App();
  modes[mode](app);
};
