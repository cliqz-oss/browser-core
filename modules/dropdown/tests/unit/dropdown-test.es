/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule, sinon */
/* eslint new-cap: off */

const urlImports = require('../../core/unit/utils/url-parser');

export default describeModule('dropdown/dropdown',
  function () {
    return {
      './templates': {},
      './telemetry': {},
      '../core/url': {},
      '../core/events': {},
      './context-menu': {},
      'platform/globals': {
        chrome: {},
      },
      '../platform/browser': {},
      ...urlImports,
    };
  },
  function () {
    let dropDown;

    beforeEach(function () {
      dropDown = new (this.module()).default({
        querySelectorAll() { return []; },
      }, null, {});
      dropDown.lastMouseMove = Date.now() - 100;
    });

    describe('#onMouseMove', function () {
      context('with .result element having non-selectable class', function () {
        let evt;

        beforeEach(function () {
          evt = {
            originalTarget: {
              nodeType: 1,
              closest() {
                return {
                  classList: {
                    contains() {
                      return true;
                    }
                  }
                };
              },
            },
          };
        });

        it('Should not call #reportHover', function () {
          dropDown.actions.reportHover = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.actions.reportHover).to.have.not.been.called;
        });
      });

      context('with .result element does not have non-selectable class', function () {
        let evt;

        beforeEach(function () {
          evt = {
            originalTarget: {
              nodeType: 1,
              closest() {
                return {
                  classList: {
                    contains() {
                      return false;
                    }
                  },
                  dataset: {
                    url: '',
                  }
                };
              },
            },
          };

          dropDown.results = {
            get() {
              return {
                serialize() {}
              };
            },
            selectableResults: {
              findIndex() {
                return 1;
              }
            }
          };
        });

        it('calls #reportHover', function () {
          dropDown.actions.reportHover = sinon.spy();
          dropDown.updateSelection = sinon.spy();

          dropDown.onMouseMove(evt);

          chai.expect(dropDown.actions.reportHover).to.have.been.called;
        });
      });
    });
  });
