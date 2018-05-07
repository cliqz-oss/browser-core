/**
 * Module containing the code that will be injected on the web page to identify the
 * coupon fields (textbox + button).
 * General algorithm logic:
 *  - for every T (target = all "form" elements, also the ones detected on mutations)
 *    - check if we have a input field that matches one of the list.
 *    - check if we have a button field in the same form
 *  - pick the ones that match the conditions and assume it is the voucher.
 *  - listen for click events
 */

// the keywords we want to check to identify for input fields
//
const couponKeyWords = ['voucher', 'discount', 'coupon', 'rabatt', 'gutschein', 'promo'];

/**
 * concat 2 lists into one
 * @param  {[type]} l1 [description]
 * @param  {[type]} l2 [description]
 * @return {[type]}    [description]
 */
const concat = (l1, l2) => l1.concat(l2);

/**
 * this method will retrieve all the potential fields that we thing that are for
 * inserting coupon codes.
 */
function getInputFieldsFromTarget(target) {
  const inputFileds = target.querySelectorAll('input');
  return [...inputFileds].filter(
    x => x.type !== 'hidden' && x.type !== 'password' && couponKeyWords.some(
      key => x.name.toLowerCase().indexOf(key) > -1 || x.id.toLowerCase().indexOf(key) > -1
    )
  );
}

function getButtonFieldsFromTarget(target) {
  // for some cases we have buttons, for some others we have
  // <input class="btn" data-action="save" value="Einlösen" type="submit">
  const buttons = [...target.querySelectorAll('button')] || [];
  const inputs = ([...target.querySelectorAll('input')] || [])
    .filter(t => t && (t.type && t.type.toLowerCase() === 'submit'));
  return concat(buttons, inputs);
}


/**
 * Will get the list of buttons, inputFields targets from a list of forms we see
 * on the page and filtering those ones that we consider they are to an .
 * @param  {[type]} forms [description]
 * @return {[type]}       [description]
 */
function getVoucherElements(forms) {
  // the way it work, probably we need to improve this is:
  // for each form:
  //  - get input fields that seems to be associated to voucher
  //  - get associated buttons (submit)
  //  - if none or more than one input field => discard?
  //  - if none button or more than one => discard result completely
  const entriesResults = [];
  forms.filter(f => f).forEach((form) => {
    // get the input fields
    const inputFields = getInputFieldsFromTarget(form);
    if (inputFields.length !== 1) {
      // continue with the next one, note that actually here we may want
      // to choose the most probable one instead of none, for now none is fine
      return;
    }
    const buttons = getButtonFieldsFromTarget(form);
    if (buttons.length !== 1) {
      return;
    }

    // we have a form that satisfies the conditions
    entriesResults.push({
      input: inputFields[0],
      button: buttons[0],
    });
  });

  return entriesResults;
}

const getCouponsForms = (forms) => {
  const voucherEntries = getVoucherElements(forms);
  // now we need to decide what to do if we have more than one
  if (voucherEntries.length !== 1) {
    // nothing for now
    return null;
  }

  // else we have the element we want to track
  return voucherEntries[0];
};

// ////////////////////////////////////////////////////////////////////////////

/**
 * This helper class will contain the form we assume is related to the voucher
 * basically the { input, button } + some handy functions
 */
class CouponForm {
  constructor({ input, button, notifyCallback }) {
    this.input = input;
    this.button = button;
    this.notifyCallback = notifyCallback;
    this._clickCb = this._clickCb.bind(this);
  }

  unload() {
    if (this.button) {
      this.button.removeEventListener('click', this._clickCb);
    }
  }

  isValid() {
    return this.input && this.button;
  }

  configure() {
    if (this.isValid()) {
      // remove first if already exists
      this.button.removeEventListener('click', this._clickCb);
      this.button.addEventListener('click', this._clickCb);
    }
  }

  setInputFieldContent(content) {
    if (this.input && this.input.value.length === 0 && content !== null) {
      this.input.value = content;
    }
  }

  getInputField() {
    return this.input ? this.input.value : '';
  }

  _clickCb(event) {
    if (!event || event.type !== 'click') {
      return;
    }
    // now we perform the real callback
    const couponCode = this.getInputField();
    if (this.notifyCallback) {
      this.notifyCallback(couponCode);
    }
  }
}

/**
 * This class will find the form and listen for any webpage modification to get the
 * forms we think are associated to the vouchers and perform the associated
 * actions.
 */
export default class CouponFormHandler {
  constructor(window, chrome, backgroundAction) {
    this.window = window;
    this.chrome = chrome;
    this.offerInfo = null;
    this.mutationObserver = null;
    this.backgroundAction = backgroundAction;
    // cb
    this._onMutations = this._onMutations.bind(this);
    this._onFormClicked = this._onFormClicked.bind(this);
  }

  // activate on load
  activate(offerInfo) {
    if (!offerInfo) {
      return;
    }
    this.offerInfo = offerInfo;

    // configure mutations if needed
    if (!this.mutationObserver) {
      this.mutationObserver = new this.window.MutationObserver(mutations =>
        this._onMutations(mutations));
      this.mutationObserver.observe(this.window.document, { childList: true, subtree: true });
    }

    // get the forms
    this.pageLoaded();
  }

  pageLoaded() {
    const forms = [...this.window.document.querySelectorAll('form')];
    this._getAndProcessFormsFromTargets(forms);
  }

  // deactivate
  deactivate() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  // //////////////////////////////////////////////////////////////////////////
  //                                    PRIVATE
  // //////////////////////////////////////////////////////////////////////////
  //

  _onFormClicked(couponValue) {
    // here we should call the core again
    if (this.backgroundAction) {
      this.backgroundAction('couponFormUsed', {
        offerInfo: this.offerInfo,
        couponValue,
        url: this.window.location.href,
      });
    }
  }

  _onMutations(mutations) {
    // TODO: improve here the way we can filter mutations.
    // - probably we can check if the current mutation is the form itself (if we have
    // one) then we just check that one, otherwise we check all the full mutations
    const forms = new Set(mutations.map(m => m.target)
      .filter(t => (t && t.tagName && t.tagName.toLowerCase() === 'form')));
    this._getAndProcessFormsFromTargets([...forms]);
  }

  _getAndProcessFormsFromTargets(targets) {
    const couponForm = getCouponsForms(targets);
    if (couponForm) {
      couponForm.notifyCallback = this._onFormClicked;
      // check if we need to unload the latest
      if (this.couponForm) {
        this.couponForm.unload();
      }
      this.couponForm = new CouponForm(couponForm);
    }
    this._processCouponForm(this.couponForm);
  }

  _processCouponForm(couponForm) {
    if (couponForm) {
      // set the coupon code if needed
      if (this.offerInfo.autoFillField) {
        couponForm.setInputFieldContent(this.offerInfo.code);
      }
      couponForm.configure();
    }
  }
}

