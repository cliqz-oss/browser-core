import {
  registerContentScript,
} from '../core/content/helpers';

registerContentScript('content-script-tests', 'http://example.com/', (window, _, CLIQZ) => {
  const testModule = CLIQZ.app.modules['content-script-tests'];
  testModule.action('contentScriptRan', testModule.state);
});
