import { Components } from '../globals';

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
      width: options.defaultWidth || 390,
      height: options.defaultHeight || 250,
    };

    this.windows = new WeakMap();
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

        document.getElementById('PanelUI-multiView').appendChild(view);
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
      },

      onViewShowing: (event) => {
        const doc = event.target.ownerDocument;
        const win = doc.defaultView;
        const view = doc.getElementById(this.viewId);

        const iframe = win.document.createElement('iframe');
        iframe.setAttribute('id', `${this.id}-iframe`);
        iframe.setAttribute('type', 'content');
        iframe.setAttribute('src', `${this.defaults.popup}?pageAction=${this.isPageAction}`);

        const onMessage = (ev) => {
          const data = JSON.parse(ev.data);

          if (data.origin !== 'iframe') {
            return;
          }

          this.dispatchAction(win, data);
        };

        const windowProxy = this.getWindowProxy(win);
        windowProxy.onMessage = onMessage;

        iframe.addEventListener('load', function onReady() {
          iframe.removeEventListener('load', onReady, true);
          iframe.contentWindow.addEventListener('message', onMessage);
        }, true);

        view.appendChild(iframe);

        // start with a decent size which should be close to the final one
        this.resizePopup(win, {
          width: this.defaults.width,
          height: this.defaults.height
        });
      },

      onViewHiding: (event) => {
        const doc = event.target.ownerDocument;
        const win = doc.defaultView;
        const view = doc.getElementById(this.viewId);
        const iframe = view.querySelector('iframe');

        const windowProxy = this.getWindowProxy(win);
        const onMessage = windowProxy.onMessage;

        iframe.contentWindow.removeEventListener('message', onMessage);
        view.removeChild(iframe);
      },
    });

    this.widget = widget;
  }

  setPositionBeforeElement(nextElementId) {
    const nextDetails = CustomizableUI.getPlacementOfWidget(nextElementId) || { position: -1 };

    if (nextDetails.position > 0) {
      // we take over the position of the target next Element
      CustomizableUI.moveWidgetWithinArea(this.id, nextDetails.position);
    }
  }

  shutdown() {
    CustomizableUI.destroyWidget(this.id);
  }

  getWindowProxy(window) {
    return this.windows.get(window);
  }

  addWindow(window, actions) {
    this.windows.set(window, {
      actions,
    });
  }

  removeWindow(window) {
    this.windows.delete(window);
  }

  dispatchAction(window, data) {
    const windowProxy = this.getWindowProxy(window);
    const message = data.message;
    windowProxy.actions[message.action](message.data);
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
      const view = iframe.parentElement;
      if (view.getAttribute('mainview') !== 'true') {
        newHeight += 17; // 17px for scrollbar;
      }
      iframe.style.width = `${width}px`;
      iframe.style.height = `${newHeight}px`;
      view.setAttribute('style', `height: ${newHeight}px; max-height: ${newHeight}px;`);
    }
  }

  setBadgeText(window, value) {
    const node = window.document.getElementById(this.id);
    if (node) {
      this.updateButton(node, {
        badgeText: value,
        enabled: true,
      });
    }
  }

  setBadgeBackgroundColor(window, value) {
    const node = window.document.getElementById(this.id);
    if (node) {
      this.updateButton(node, {
        badgeBackgroundColor: value,
        enabled: true,
      });
    }
  }

  setIcon(window, value) {
    const node = window.document.getElementById(this.id);
    if (node) {
      this.updateButton(node, {
        icon: value,
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

    const badgeNode = node.ownerDocument.getAnonymousElementByAttribute(node,
                                        'class', 'toolbarbutton-badge');
    if (badgeNode) {
      const color = tabData.badgeBackgroundColor ||
                    badgeNode.style.backgroundColor ||
                    this.defaults.badgeBackgroundColor;
      if (color) {
        badgeNode.style.backgroundColor = color;
      }
    }

    if (tabData.icon) {
      node.setAttribute('style', `
        list-style-image: url(${tabData.icon});
        --webextension-menupanel-image: url(${tabData.icon});
        --webextension-menupanel-image-2x: url(${tabData.icon});
        --webextension-toolbar-image: url(${tabData.icon});
        --webextension-toolbar-image-2x: url(${tabData.icon});
      `);
    }
  }
}
