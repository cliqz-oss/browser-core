# Framework changelog

## Version 1.14

* [PR-3011](https://github.com/cliqz/navigation-extension/pull/3011)

  `utils.callAction` is removed in favor of `kord` module wrapper.

  Old code:

    ```javascript
      import utils from '../core/utils';

      utils.callAction('core', 'queryCliqz', ['some query']);
    ```

  New code:

    ```javascript
      import inject from '../core/kord/inject';

      const core = inject.module('core');
      core.action('queryCliqz', 'some query');
    ```

* [PR-3034](https://github.com/cliqz/navigation-extension/pull/3034)

  `utils.callWindowAction` is removed in favor of `kord` module wrapper.

  Old code:

    ```javascript
      import utils from '../core/utils';

      utils.callWindowAction(window, 'control-center', 'setBadge', [17]);
    ```

  New code:

    ```javascript
      import inject from '../core/kord/inject';

      const controlCenter = inject.module('control-center');
      controlCenter.windowAction(window, 'setBadge', 17);
    ```

## Version 1.18

* [PR-3596](https://github.com/cliqz/navigation-extension/pull/3596)

  Improvements to build system:

  * broccoli updated to 1.x (it is faster and compatible with new plugins)
  * babel updated to 6.x (better error reporting and ability to use presets)
  * build supports `jsx` compilation
