import { AppRegistry } from 'react-native';
import FixturesList from './debug/FixturesList';
import SearchUI from './SearchUI';
import App from '../core/app';
import console from '../core/console';
import events from '../core/events';
import inject from '../core/kord/inject';
import modules from '../core/app/modules';
import { window } from '../platform/globals';

AppRegistry.registerComponent('FixturesList', () => FixturesList);
AppRegistry.registerComponent('SearchUI', () => SearchUI);

const modes = {
  live: (app) => {
    app.start().then(() =>
      AppRegistry.runApplication('SearchUI', {
        initialProps: {
        },
        rootTag: document.getElementById('root')
      })
    ).then(() => app.modules.search.getWindowLoadingPromise(window)
    ).then(() => {
      const queryParams = new URLSearchParams(window.location.search)
      const queries = queryParams.getAll('query');
      const query = queries[queries.length - 1] || '';
      window.addEventListener('message', ({ data }) => {
        events.pub(data.type, data.data);
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

window.addEventListener('load', () => startDebug('live'));
