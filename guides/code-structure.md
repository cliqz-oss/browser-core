# Code structure

Extension codebase is split into modules.

Each module:

* is a separate functional unit,
* is independent - that means, can depend only on `core` module, which acts as common library of helper function and abstracts over platform the code is being run on,
* can be enabled (asynchronously),
* can be disabled (synchronously),
* should be platform independent, platform specific code should be provided by `core` module and implemented in `platforms` folder,
* communicate with other modules using *events* - that means, can react to events published by other modules and can publish own events, but cannot expect that any module will listen to them,
* expose a public api called *actions*,
* can call other module actions with assumption that those modules can be missing or disabled,
* has maintainer, who should review changes to that module before merging,
* should pass automatic code style guide check,
* can use `sass` for stylesheet compilation,
* can use `handlebars` for templates compilation,
* can use `browserify` to include node module,
* should not call platform dependent APIs in UI,
* should provide unit tests that will run in full isolation on `nodejs`,
* having UI, should provide UI tests called "content tests" that run in Chrome.
