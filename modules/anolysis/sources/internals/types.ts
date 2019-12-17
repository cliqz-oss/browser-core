/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// NOTE: this one should eventually be moved where `pacemaker` service is
// implemented but we keep it here for now. This also asks the question about
// sharing types between modules without introducing a hard dependency. Maybe
// each module should be registered as a 'typeRoot'?
export type PacemakerTimeout = { stop: () => void };

export interface Pacemaker {
  setTimeout: (cb: (...args: any[]) => void, timeout: number) => PacemakerTimeout;
  clearTimeout: (timeout: PacemakerTimeout | null) => void;
  register: (cb: (...args: any[]) => void, opt: { timeout: number }) => PacemakerTimeout;
}
