/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import BaseResult, { Subresult } from './base';

class AdultAnswerResult extends Subresult {
  get displayUrl() {
    return null;
  }

  get urlbarValue() {
    return this.query;
  }

  get className() {
    return this.rawResult.className;
  }

  click(href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    const adultAssistant = this.resultTools.assistants.adult;
    const actionName = action.actionName;
    adultAssistant[actionName](this.query);
  }
}

export default class AdultQuestionResult extends BaseResult {
  get template() {
    return 'adult-question';
  }

  get internalResults() {
    return this.resultTools.assistants.adult.actions.map((action) => {
      let additionalClassName = '';

      if (action.actionName === 'allowOnce') {
        additionalClassName = 'adult-allow-once';
      }

      const result = new AdultAnswerResult(this, {
        title: action.title,
        url: `cliqz-actions,${JSON.stringify({ type: 'adult', actionName: action.actionName })}`,
        text: this.rawResult.text,
        className: additionalClassName,
      });
      return result;
    });
  }

  get selectableResults() {
    return this.internalResults;
  }
}
