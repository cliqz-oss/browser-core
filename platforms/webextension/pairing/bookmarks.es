/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

function getNodes(node, list) {
  const { url, title, dateAdded, children } = node;
  if (url && url.startsWith('http')) {
    list.push({ url, title, lastModified: dateAdded });
  }
  if (children) {
    for (const child of children) {
      getNodes(child, list);
    }
  }
}

export default async function () {
  const list = [];
  getNodes({ children: await browser.bookmarks.getTree() }, list);
  return list;
}
