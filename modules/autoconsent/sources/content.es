/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { handleContentMessage } from '@cliqz/autoconsent';
import { registerContentScript } from '../core/content/register';

registerContentScript({
  module: 'autoconsent',
  matches: ['http://*/*', 'https://*/*'],
  matchAboutBlank: false,
  allFrames: true,
  js: [
    (window, chrome, CLIQZ) => {
      function createOverlay() {
        const root = document.createElement('span');
        const shadow = root.attachShadow({ mode: 'closed' });
        // TODO: remove CSS framework - all styles here should be custom and inline to
        // prevent interference from page
        const html = `
        <style type="text/css">
        :host {
          all: initial;
        }
        .autoconsent-hidden {
          display: none;
        }
        .autoconsent-ui {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2147483647 !important;
          background: rgba(0, 0, 0, 0.3);
        }
        .autoconsent-container {
          min-width: 320px;
          max-width: 400px;
          min-height: 170px;
          position: relative;
          margin: 15vh auto;
        }
        .autoconsent-frame {
          margin: auto;
          width: 400px;
          height: 170px;
        }
        .shake {
          animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
        @keyframes shake {
          10%, 90% {
            transform: translate3d(-1px, 0, 0);
          }
          
          20%, 80% {
            transform: translate3d(2px, 0, 0);
          }
        
          30%, 50%, 70% {
            transform: translate3d(-4px, 0, 0);
          }
        
          40%, 60% {
            transform: translate3d(4px, 0, 0);
          }
        }
        </style>
        <div class="autoconsent-ui autoconsent-hidden" id="mask">
          <div class="autoconsent-container">
            <iframe
              class="autoconsent-frame"
              id="popup"
              src="${chrome.runtime.getURL('modules/autoconsent/popup.html')}"
              frameBorder="0"
            >
          </div>
        </div>
      `;
        shadow.innerHTML = html;

        // reduce z-index of any other popup
        function reduceZIndex(e) {
          if (parseInt(window.getComputedStyle(e).zIndex, 10) >= 2147483647) {
            e.style = 'z-index: 2147483646 !important';
          }
        }
        document
          .querySelectorAll('body > div,#gdpr-modal-html,div[class^="popup_overlay-"]')
          .forEach(reduceZIndex);

        const firstElement = document.querySelector('body > :first-child');
        if (firstElement) {
          document.body.insertBefore(root, firstElement);
        } else {
          document.body.appendChild(root);
        }

        function showModel() {
          shadow.getElementById('mask').className = 'autoconsent-ui';
        }

        window.addEventListener('message', async ({ origin, data }) => {
          const extensionOrigin = chrome.runtime.getURL('').slice(0, -1);
          if (origin !== extensionOrigin) {
            // not from an extension page
            return;
          }
          const { action } = data;
          if (action === 'close') {
            CLIQZ.app.modules.autoconsent.action('setOnboardingWasClosed', 'click');
            shadow.getElementById('mask').className = 'autoconsent-ui autoconsent-hidden';
          } else if (action === 'enable') {
            await CLIQZ.app.modules.autoconsent.action('setConsent', 'default', 'always');
            CLIQZ.app.modules.autoconsent.action('setOnboardingWasCompleted');
            shadow.getElementById('mask').className = 'autoconsent-ui autoconsent-hidden';
          } else if (action === 'later') {
            CLIQZ.app.modules.autoconsent.action('setOnboardingWasDeferred');
            shadow.getElementById('mask').className = 'autoconsent-ui autoconsent-hidden';
          }
        });

        shadow.getElementById('mask').addEventListener('click', () => {
          shadow.getElementById('popup').className = 'autoconsent-frame shake';
          setTimeout(() => {
            shadow.getElementById('popup').className = 'autoconsent-frame';
          }, 1000);
        });

        window.addEventListener('keydown', ({ key }) => {
          if (key === 'Escape') {
            // close popup
            CLIQZ.app.modules.autoconsent.action('setOnboardingWasClosed', 'key');
            shadow.getElementById('mask').className = 'autoconsent-ui autoconsent-hidden';
          }
        });

        return {
          showModel,
        };
      }

      let overlay = null;

      return {
        showModal: () => {
          if (!overlay) {
            overlay = createOverlay();
          }
          CLIQZ.app.modules.core.action('sendTelemetry', {
            action: 'shown',
          }, false, 'metrics.autoconsent.onboarding');
          overlay.showModel();
          return Promise.resolve(true);
        },
        dispatchAutoconsentMessage: message => handleContentMessage(message),
      };
    },
  ],
});
