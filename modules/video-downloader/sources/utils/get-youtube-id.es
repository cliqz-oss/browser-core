/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// From https://stackoverflow.com/questions/2964678/jquery-youtube-url-validation-with-regex
const regex = /^(?:https?:\/\/)?(?:(?:www|m)\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

export default function (url) {
  const match = url && url.match(regex);
  if (match) {
    return match[1];
  }
  return null;
}
