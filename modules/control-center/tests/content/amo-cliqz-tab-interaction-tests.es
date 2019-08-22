/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOff } from './fixtures/amo-cliqz-tab';

describe('Control Center: AMO, Cliqz tab interaction tests', function () {
  let subject;
  const target = 'control-center';

  beforeEach(function () {
    subject = new Subject();
  });

  afterEach(function () {
    subject.unload();
  });

  function updateGeneralStateTest(selector) {
    it('sends message to update general state', function () {
      subject.query(selector).click();
      return waitFor(
        () => subject.messages.find(message => message.action === 'updateState')
      ).then(
        message => expect(message).to.have.property('args').that.deep.equals(['active'])
      );
    });
  }

  describe('with Cliqz tab on', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });

    it('renders cliqz tab box', function () {
      expect(subject.query('.amo #cliqz-tab')).to.exist;
    });

    describe('click on cliqz tab switch', function () {
      updateGeneralStateTest('.amo #cliqz-tab .cqz-switch-box');

      it('sends message to deactivate cliqz tab', function () {
        subject.query('.amo #cliqz-tab .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'cliqz-tab')
        ).then(
          (message) => {
            expect(message).to.have.property('args').that.deep.equals([{ status: false, isPrivateMode: false }]);
          }
        );
      });
    });
  });

  describe('with Cliqz tab off', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOff
      });
      return subject.load();
    });

    it('renders cliqz tab box', function () {
      expect(subject.query('.amo #cliqz-tab')).to.exist;
    });

    describe('click on cliqz tab switch', function () {
      updateGeneralStateTest('.amo #cliqz-tab .cqz-switch-box');

      it('sends message to activate cliqz tab', function () {
        subject.query('.amo #cliqz-tab .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'cliqz-tab')
        ).then(
          (message) => {
            expect(message).to.have.property('args').that.deep.equals([{ status: true, isPrivateMode: false }]);
          }
        );
      });
    });
  });
});
