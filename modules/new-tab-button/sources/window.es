import maybe from '../core/helpers/maybe';
import Panel from '../core/ui/panel';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import utils from '../core/utils';


export default class {

  constructor(settings) {
    this.window = settings.window;

    this.panel = new Panel(
      this.window,
      'chrome://cliqz/content/new-tab-button/index.html',
      'new-tab-button-panel'
    );

    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onClick = this.onClick.bind(this);

    this.actions = {

      lightUp: () => {
        maybe(this, 'buttonA').then(button => {
          button.classList.add('has-notification');
        });
        maybe(this, 'buttonB').then(button => {
          button.classList.add('has-notification');
        });
      },

      lightDown: () => {
        maybe(this, 'buttonA').then(button => {
          button.classList.remove('has-notification');
        });
        maybe(this, 'buttonB').then(button => {
          button.classList.remove('has-notification');
        });
      },

    };
  }

  init() {
    this.cssUrl = 'chrome://cliqz/content/new-tab-button/styles/xul.css';
    addStylesheet(this.window.document, this.cssUrl);
    this.panel.attach();

    maybe(this, 'buttonA').then(button => {
      this.addButtonListeners(button);
    });

    maybe(this, 'buttonB').then(button => {
      this.addButtonListeners(button);
    });
  }

  addButtonListeners(button) {
    button.addEventListener('mouseover', this.onMouseOver);
    button.addEventListener('mouseout', this.onMouseOut);
    button.addEventListener('click', this.onClick);
  }

  removeButtonListeners(button) {
    button.removeEventListener('mouseover', this.onMouseOver);
    button.removeEventListener('click', this.onClick);
    button.addEventListener('mouseout', this.onMouseOut);
  }

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);

    try {
      this.removeButtonListeners(this.buttonA());
      this.removeButtonListeners(this.buttonB());
    } catch (e) {
      // no button no problem
    }

    if (this.panel) {
      this.panel.detach();
      delete this.panel;
    };
  }

  onMouseOver() {
    maybe(this, 'buttonA').then(button => {
      //this.panel.open(button);
    });
  }

  onMouseOut() {
    //this.panel.hide();
  }

  onClick(e) {
    const hasNotification = e.target.classList.contains('has-notification');
    utils.telemetry({
      type: 'activity',
      action: 'click',
      target: 'new_tab',
      has_notification: hasNotification
    });
  }

  buttonA() {
    return this.window.document.getAnonymousElementByAttribute(
      this.window.gBrowser.tabContainer, 'anonid', 'tabs-newtab-button');
  }

  buttonB() {
    return this.window.document.getElementById('new-tab-button');
  }
}
