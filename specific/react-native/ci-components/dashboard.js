/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Board from './board';

export default class Dashboard extends Board {
  get notifications() {
    const store = this.props.screenProps.store;
    return store.notifications || [];
  }
  get recommendations() {

    if (this.props.screenProps.news.news !== undefined) {
      const domainsHistory = Object.keys(this.props.screenProps.store.history.domains);
      const news = this.props.screenProps.news.news.filter(newsObj => !domainsHistory.some(elem => elem.indexOf(newsObj.displayUrl) !== -1));
      return news || [];
    }

    return [];
  }

  get history() {
    const params = this.props.navigation.state.params;
    return params;
  }
}
