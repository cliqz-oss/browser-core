/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import ResourceLoader from '../core/resource-loader';

const ARCHIVED_MESSAGES_IDS_KEY = 'archivedMessageIds';

export default background({
  requiresServices: [
    'storage',
  ],

  async init(settings, browser, { services: { storage } }) {
    this.storage = storage;
    this.resourceLoader = new ResourceLoader(['inbox', 'messages.json'], {
      remoteURL: `${settings.CDN_BASEURL}/notifications/messages.json`,
      cron: 1000 * 60 * 60 * 12, // update every 12 hours
      updateInterval: 1000 * 60 * 5, // check for updates 5 minutes after the browser starts
      remoteOnly: true
    });

    this.resourceLoader.onUpdate(() => {
      this.storage.delete(ARCHIVED_MESSAGES_IDS_KEY);
    });

    // preload the messages
    this.resourceLoader.load();
  },

  unload() {

  },

  async getArchivedMessageIds() {
    return new Set(...(await this.storage.get(ARCHIVED_MESSAGES_IDS_KEY) || []));
  },

  events: {

  },

  actions: {
    async getMessages() {
      const archivedMessageIds = await this.getArchivedMessageIds();
      const messages = await this.resourceLoader.load();
      return messages.filter(message => archivedMessageIds.indexOf(message.id) !== -1);
    },
    async archiveMessage(id) {
      const archivedMessageIds = await this.getArchivedMessageIds();
      archivedMessageIds.add(id);
      await this.storage.set(ARCHIVED_MESSAGES_IDS_KEY, ...archivedMessageIds);
    },
  },
});
