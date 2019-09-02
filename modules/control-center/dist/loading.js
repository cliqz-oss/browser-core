/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Fix - Browseraction goes blank.
 * We need to initiate a repaint to show HTML in browserAction popup
 * So we load this script to trigger repaint.
 */
const loaderDiv = document.getElementById('loader');
loaderDiv.appendChild(document.createElement('div'));
