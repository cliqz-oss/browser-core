
# Requirements

* [Node.js](https://nodejs.org) `8` LTS is recommended, but version `9` will work as well.

(*warning*: Node.js 10 is currently not supported)

To manage multiple Node.js versions, you can use [nvm](https://github.com/creationix/nvm).

1. `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash`
2. Restart your terminal
3. Ensure that nvm was installed correctly with ```nvm --version```
4. Install recommended version of Node `nvm install (8 | 9)`
5. If multiple versions are installed, set recommended Node version as default `nvm alias default (8 | 9)`

# Contribution Workflow

To setup your environment:

1. Fork the repository
2. Get a local copy of it: `git clone ...`
3. Add the `upstream` repository as a remote: `git remote add upstream git@github.com:cliqz/navigation-extension.git`

When you are ready to contribute:

1. `git fetch upstream` (get latest changes from `upstream`)
2. `git checkout upstream/master` (you might need to run `npm install` again
   from time to time if `package.json` changed)
3. `git checkout -b <my-feature-branch>` (create a new local branch from the
   latest `upstream/master` revision)

Note that it is *not necessary* to have your own `master` branch. Actually
having a `master` branch on your fork is not needed, as you can always take the
latest changes from `upstream/master`.

Do some changes, run tests locally (check the following sections for more
details) and then create a pull request once you are ready.

If changes are pushed upstream while you are working on your changes, it might
be necessary to *rebase* your branch against `master`. To do so:

1. `git fetch upstream`
2. `git rebase upstream/master`
3. `git push origin <my-feature-branch> --force-with-lease` (you need to force push because *rebase* will re-write your history)

This will make sure that all commits from upstream appear before your own local
changes in the git history.

# Installing dependencies

1. `npm install -g broccoli-cli`
2. `npm install` (or `yarn install`).

# Building the Extension

To build the extension and load it into Firefox:

```sh
./fern.js serve ./configs/<CONFIG>
```

The build artifacts can be found in the `./build` folder. It is also possible to
only build the extension without serving it in a browser with:

```sh
./fern.js build ./configs/<CONFIG>
```

Which accepts the same arguments as the `serve` sub-command.

You can change flavors by specifying a configuration file stored
under the `./configs` folder. Passing this argument is mandatory.

Examples:

* `./fern.js build ./configs/amo.js`
* `./fern.js serve ./configs/browser.js`

## Custom prefs

If you want to load your browser with predefined preferences set, all
you have to do is create a `.custom-prefs.json` file at the root of the
project and add your custom prefs there.

Example:

```json
{
  "extensions.cliqz.triggersBE": " http://10.1.21.104",
  "extensions.cliqz.offers2FeatureEnabled": true,
  "extensions.cliqz.offersDevFlag": true,
  "extensions.cliqz.offersHubTrigger": "auto"
}
```

# Testing

Please see [testing guidelines](./guides/test-guidelines.md).

# Contributions

Please use the configuration from [editorconfig](/.editorconfig) and check the
[Airbnb Javascript Style Guide](https://github.com/airbnb/javascript) which we
use in this project.

# Troubleshooting

* Make sure you have latest npm version installed
* Make sure you remove node_modules folder ```rm -rf node_modules``` before running ```npm install```
* Make sure you have python2 binary executable. On Mac it can be solved by running ```brew install python2```
