/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

export default describeModule('freshtab/main',
  function () {
    return {
      'platform/globals': {
        chrome: {},
      },
      'core/config': {
        default: {
          settings: {
            NEW_TAB_URL: '',
            channel: '99',
          }
        },
      },
      'core/prefs': {
        default: {
        },
      },
      'core/platform': {
        isDesktopBrowser: false,
        getResourceUrl: () => {},
      },
      'platform/freshtab/new-tab-setting': {
        setNewTabPage: '[dynamic]',
        resetNewTabPage: '[dynamic]',
        setHomePage: '[dynamic]',
        getHomePage: '[dynamic]',
        migrate: '[dynamic]',
      },
    };
  },
  function () {
    let newTab;

    beforeEach(function () {
      newTab = this.module().default;
    });

    context('inside CLIQZ browser', function () {
      beforeEach(function () {
        this.deps('core/platform').isDesktopBrowser = true;
      });

      it('#isActive is always true', function () {
        chai.expect(newTab.isActive).to.equal(true);
      });
    });

    context('inside non CLIQZ browser', function () {

    });
  });
