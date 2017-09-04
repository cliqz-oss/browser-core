import BaseResult from './base';
import console from '../../core/console';

class LocalInfoResult extends BaseResult {
  get mapImg() {
    return this.rawResult.mapImg;
  }
}

class TextResult extends BaseResult {

  get textType() {
    return this.rawResult.textType;
  }

  get displayText() {
    return this.rawResult.text;
  }

  click(window, href, ev) {
    this.actions.copyToClipboard(this.rawResult.text);
    const el = ev.target;
    el.classList.add('copied');
    setTimeout(() => {
      el.classList.remove('copied');
    }, 1000);
  }
}

export class ShareLocationButton extends BaseResult {

  get elementId() {
    if (!this._elementId) {
      const id = Math.floor(Math.random() * 1000);
      this._elementId = `result-share-location-${id}`;
    }
    return this._elementId;
  }

  get displayUrl() {
    return this.rawResult.text;
  }

  get className() {
    return this.rawResult.className;
  }

  get elementClassName() {
    return this.rawResult.className;
  }

  didRender(dropdownElement) {
    this.element = dropdownElement.querySelector(`#${this.elementId}`);
    this.spinner = dropdownElement.ownerDocument.createElement('div');
    this.spinner.className = 'spinner';
  }

  click(window, href) {
    this.element.appendChild(this.spinner);

    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    const locationAssistant = this.actions.locationAssistant;
    const actionName = action.actionName;
    if (!locationAssistant.hasAction(actionName)) {
      return;
    }
    locationAssistant[actionName]().then(() => {
      this.rawResult.onButtonClick();
    }).catch(console.error);
  }
}


export default class LocalResult extends BaseResult {
  get address() {
    return this.rawResult.address || '';
  }

  get phoneNumber() {
    return this.rawResult.phoneNumber || '';
  }

  get mapImg() {
    return this.rawResult.mapImg || '';
  }

  get mapUrl() {
    return this.rawResult.mapUrl || '';
  }

  get allResults() {
    return [
      this.mapResult,
      ...this.textResults,
    ];
  }

  get mapResult() {
    return new LocalInfoResult({
      url: this.mapUrl,
      title: 'show-map',
      text: this.rawResult.text,
      mapImg: this.mapImg,
    });
  }

  get textResults() {
    if (!this._textResults) {
      this._textResults = [];
      if (this.address) {
        const address = !this.address ? null : new TextResult({
          url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: 'copyAddress' })}`,
          text: this.address,
          textType: 'local-address',
        });
        address.actions = this.actions;

        this._textResults.push(address);
      }

      if (this.phoneNumber) {
        const phone = new TextResult({
          url: `cliqz-actions,${JSON.stringify({ type: 'location', actionName: 'copyPhoneNumber' })}`,
          text: this.phoneNumber,
          textType: 'local-phone',
        });
        phone.actions = this.actions;

        this._textResults.push(phone);
      }
    }

    return this._textResults;
  }
}
