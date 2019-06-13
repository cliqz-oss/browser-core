import { Components } from '../globals';
import utils from '../../core/utils';
import { isPrivateMode } from '../../core/browser';
import { getWindowByTabId } from '../../core/tabs';
import getContainer from './helpers';
import DefaultWeakMap from '../../core/helpers/default-weak-map';
import Defer from '../../core/helpers/defer';

const { CustomizableUI } = Components.utils.import('resource:///modules/CustomizableUI.jsm', null);

const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';


export default class BrowserAction {
  constructor(options = {}, isPageAction = false) {
    this.id = `${options.widgetId}-browser-action`;
    this.viewId = `PanelUI-webext-${options.widgetId}-browser-action-view`;
    this.widget = null;
    this.isPageAction = isPageAction;

    this.defaults = {
      enabled: true,
      title: options.default_title,
      badgeText: options.badgeText || '',
      badgeBackgroundColor: options.badgeBackgroundColor,
      icon: options.default_icon,
      popup: options.default_popup || '',
      area: CustomizableUI.AREA_NAVBAR,
      width: options.defaultWidth || (() => 390),
      height: options.defaultHeight || (() => 250),
    };

    this.windows = new DefaultWeakMap(() => ({
      ready: new Defer(),
      actions: {},
      hooks: {}
    }));

    this.telemetryType = options.widgetId;
    this.telemetryVersion = 1;
  }

  build() {
    const widget = CustomizableUI.createWidget({
      id: this.id,
      label: this.defaults.title || this.extension.name,
      viewId: this.viewId,
      type: 'view',
      removable: true,
      tooltiptext: this.defaults.title || '',
      defaultArea: this.defaults.area,

      onBeforeCreated: (document) => {
        const view = document.createElementNS(XUL_NS, 'panelview');
        view.id = this.viewId;
        view.setAttribute('flex', '1');

        getContainer(document).appendChild(view);
      },

      onDestroyed: (document) => {
        const view = document.getElementById(this.viewId);
        if (view) {
          CustomizableUI.hidePanelForNode(view);
          view.remove();
        }
      },

      onCreated: (aNode) => {
        aNode.classList.add('badged-button');
        aNode.classList.add('webextension-browser-action');
        aNode.setAttribute('constrain-size', 'true');

        this.updateButton(aNode, this.defaults);

        if (this.isPageAction) {
          // we hide the page action by default
          // and make it visible only after it gets
          // moved inside the urlbar
          aNode.style.setProperty('display', 'none');
        }
      },

      onViewShowing: (event) => {
        this.startShowingAt = Date.now();
        utils.telemetry({
          type: this.telemetryType,
          version: this.telemetryVersion,
          action: 'show',
        });

        const doc = event.target.ownerDocument;
        const win = doc.defaultView;

        this.runHook(win, 'onViewShowing', event)
          .then(() => this.createIframe(doc));
      },

      onViewHiding: (event) => {
        this.shownDurationTime = Date.now() - this.startShowingAt;
        utils.telemetry({
          type: this.telemetryType,
          version: this.telemetryVersion,
          action: 'hide',
          show_duration: this.shownDurationTime,
        });

        const doc = event.target.ownerDocument;
        const win = doc.defaultView;
        const windowProxy = this.getWindowProxy(win);

        this.runHook(win, 'onViewHiding', event);

        const view = doc.getElementById(this.viewId);
        const iframe = view.querySelector('iframe');

        if (iframe) {
          const onMessage = windowProxy.onMessage;

          iframe.contentWindow.removeEventListener('message', onMessage);
          view.removeChild(iframe);
        }
      },

      onClick: (event) => {
        const doc = event.target.ownerDocument;
        const win = doc.defaultView;
        const windowProxy = this.getWindowProxy(win);

        if (windowProxy.hooks.onClick) {
          windowProxy.hooks.onClick(event);
        }

        utils.telemetry({
          type: this.telemetryType,
          version: this.telemetryVersion,
          target: 'icon',
          action: 'click',
        });
      },
    });

    this.widget = widget;
  }

  createIframe(doc) {
    const win = doc.defaultView;
    const windowProxy = this.getWindowProxy(win);
    const view = doc.getElementById(this.viewId);
    const iframe = win.document.createElement('iframe');
    iframe.setAttribute('id', `${this.id}-iframe`);
    iframe.setAttribute('type', 'content');
    iframe.tabIndex = -1;
    iframe.setAttribute('src', `${this.defaults.popup}?pageAction=${this.isPageAction}`);

    const onMessage = (ev) => {
      const data = JSON.parse(ev.data);
      data.isPrivate = isPrivateMode(win);

      if (data.origin !== 'iframe') {
        return;
      }

      this.dispatchAction(win, data);
    };

    windowProxy.onMessage = onMessage;

    iframe.addEventListener('DOMContentLoaded', function onReady() {
      iframe.removeEventListener('DOMContentLoaded', onReady, true);
      iframe.contentWindow.addEventListener('message', onMessage);
    }, true);

    view.appendChild(iframe);

    // start with a decent size which should be close to the final one
    this.resizePopup(win, {
      width: this.defaults.width(),
      height: this.defaults.height()
    });
  }

  setPositionBeforeElement(nextElementId) {
    const nextDetails = CustomizableUI.getPlacementOfWidget(nextElementId) || { position: -1 };

    if (nextDetails.position > 0) {
      // we take over the position of the target next Element
      CustomizableUI.moveWidgetWithinArea(this.id, nextDetails.position);
    }
  }

  showPopup(window) {
    const node = window.document.getElementById(this.id);
    window.PanelUI.showSubView(
      this.viewId,
      node,
      this.defaults.area,
    );
  }

  hidePopup(window) {
    const node = window.document.querySelector(`[viewId=${this.viewId}]`);
    if (node) {
      node.hidePopup();
    }
  }

  shutdown() {
    CustomizableUI.destroyWidget(this.id);
  }

  getWindowProxy(window) {
    return this.windows.get(window);
  }

  addWindow(window, actions, hooks = {}) {
    const windowProxy = this.getWindowProxy(window);
    windowProxy.ready.resolve();
    windowProxy.actions = actions;
    windowProxy.hooks = hooks;
  }

  removeWindow(window) {
    this.windows.delete(window);

    const view = window.document.querySelector(`#${this.viewId}`);
    view.parentElement.removeChild(view);
  }

  dispatchAction(window, data) {
    const windowProxy = this.getWindowProxy(window);
    const message = data.message;
    return windowProxy.ready.promise.then(() => {
      const action = windowProxy.actions[message.action];
      if (typeof action === 'function') {
        action(message.data);
      }
    });
  }

  runHook(window, name, ...args) {
    const windowProxy = this.getWindowProxy(window);

    return windowProxy.ready.promise.then(() => {
      const hook = windowProxy.hooks[name];
      if (typeof hook === 'function') {
        hook(...args);
      }
    });
  }

  sendMessage(window, message) {
    const iframe = window.document.getElementById(`${this.id}-iframe`);
    if (iframe) {
      iframe.contentWindow.postMessage(JSON.stringify(message), '*');
    }
  }

  resizePopup(window, { width, height }) {
    let newHeight = height;
    const iframe = window.document.getElementById(`${this.id}-iframe`);
    if (iframe) {
      const widgetPlacement = CustomizableUI.getPlacementOfWidget(this.id) || {};
      const view = iframe.parentElement;
      if (widgetPlacement.area === 'PanelUI-contents') {
        newHeight += 17; // 17px for scrollbar;
      } else if (widgetPlacement.area === 'widget-overflow-fixed-list') {
        newHeight += 40; // 40px for the panel-header;
      } else if (!view.hasAttribute('mainview')) {
        // not placed explicitly in the widget overflow area but displayed here
        // forced by the width of the window
        newHeight += 40; // 40px for the panel-header;
      }

      iframe.style.width = `${width}px`;
      iframe.style.height = `${newHeight}px`;
      view.setAttribute('style', `height: ${newHeight}px; max-height: ${newHeight}px;`);
    }
  }

  setBadgeText(tabId, value) {
    const win = getWindowByTabId(tabId);
    const node = win && win.document.getElementById(this.id);
    if (node) {
      this.updateButton(node, {
        badgeText: value,
        enabled: true,
      });
    }
  }

  setBadgeBackgroundColor(tabId, value) {
    const window = getWindowByTabId(tabId);
    const node = window.document.getElementById(this.id);
    if (node) {
      this.updateButton(node, {
        badgeBackgroundColor: value,
        enabled: true,
      });
    }
  }

  setIcon(tabId, value) {
    const window = getWindowByTabId(tabId);
    const node = window.document.getElementById(this.id);
    if (node) {
      this.updateButton(node, {
        icon: () => value,
        enabled: true,
      });
    }
  }

  // Update the toolbar button |node| with the custom data.
  updateButton(node, tabData) {
    const title = tabData.title || this.defaults.title;
    node.setAttribute('tooltiptext', title);
    node.setAttribute('label', title);

    const badgeText = tabData.badgeText || node.getAttribute('badge');

    if (badgeText) {
      node.setAttribute('badge', badgeText);
    } else {
      node.removeAttribute('badge');
    }

    if (tabData.enabled) {
      node.removeAttribute('disabled');
    } else {
      node.setAttribute('disabled', 'true');
    }

    const badgeNode = node.ownerDocument.getAnonymousElementByAttribute(
      node,
      'class',
      'toolbarbutton-badge'
    );
    if (badgeNode) {
      const color = tabData.badgeBackgroundColor
                    || badgeNode.style.backgroundColor
                    || this.defaults.badgeBackgroundColor;
      if (color) {
        badgeNode.style.backgroundColor = color;
      }
    }

    if (tabData.icon) {
      const icon = tabData.icon();
      node.setAttribute('style', `
        list-style-image: url(${icon});
        --webextension-menupanel-image: url(${icon});
        --webextension-menupanel-image-2x: url(${icon});
        --webextension-toolbar-image: url(${icon});
        --webextension-toolbar-image-2x: url(${icon});
      `);
    }
  }
}
