import { Components } from '../globals';

const emptyFunc = () => {};
let PageActionClass;

try {
  const { PageActions } = Components.utils.import('resource:///modules/PageActions.jsm', null);

  PageActionClass = class {

    constructor({
      id,
      title,
      iconURL,
      shownInUrlbar = false,
      wantsIframe = false,
      subview = false,
      _insertBeforeActionID = null,
      tooltip = '',
      onCommand = emptyFunc,
      onIframeShown = emptyFunc,
      onShowingInPanel = emptyFunc,
    } = {}) {
      this.id = `${id}-page-action`;

      this.defaults = {
        id,
        title,
        iconURL,
        shownInUrlbar,
        wantsIframe,
        subview,
        _insertBeforeActionID,
        tooltip,
        onCommand,
        onIframeShown,
        onShowingInPanel,
      };
    }

    build() {
      this.pageAction = PageActions.actionForID(this.id) ||
        PageActions.addAction(new PageActions.Action(this.defaults));
    }

    shutdown() {
      if (this.pageAction) {
        this.pageAction.remove();
        this.pageAction = null;
      }
    }
  };
} catch (e) {
  PageActionClass = class {
    build() {
    }
    shutdown() {
    }
  };
}

const PageAction = PageActionClass;
export default PageAction;
