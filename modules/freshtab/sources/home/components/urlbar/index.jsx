/* global KEY_EVENTS_RECORDER */
import React from 'react';
import cliqz from '../../cliqz';
import t from '../../i18n';
import { urlBarBlurSignal, urlBarFocusSignal } from '../../services/telemetry/urlbar';

const SPECIAL_KEYS = [8, 9, 13, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 91, 224];
const styles = {
  transition: 'all 0.3s ease-in-out'
};

class Urlbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: true
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
  }

  componentDidMount() {
    try {
      this.textInput.value += KEY_EVENTS_RECORDER.text;
      KEY_EVENTS_RECORDER.stop();
    } catch (e) {
      // eslint-disable-next-line
      console.warn('KEY_EVENTS_RECORDER seems to be missing. Make sure it still needed here.');
    }
    this.textInput.addEventListener('focus', urlBarFocusSignal);
    this.textInput.addEventListener('blur', urlBarBlurSignal);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      visible: nextProps.visible
    });
  }

  componentWillUnmount() {
    this.textInput.removeEventListener('focus', urlBarFocusSignal);
    this.textInput.removeEventListener('blur', urlBarBlurSignal);
  }

  _queryCliqz(input) {
    cliqz.core.queryCliqz(input);

    cliqz.core.sendTelemetry({
      type: 'home',
      action: 'search_keystroke'
    }, false, '');

    setTimeout(() => {
      this.textInput.value = '';
      this.textInput.style.visibility = 'hidden';
    }, 0);
  }

  handlePaste(ev) {
    this._queryCliqz(ev.clipboardData.getData('text'));
  }

  handleKeyDown(ev) {
    const value = ev.target.value;
    let input = SPECIAL_KEYS.indexOf(ev.which) > -1 ? '' : ev.key;

    if (ev.keyCode === 13) {
      input = value;
    }

    if (ev.key === 'Tab') {
      return;
    }

    // ignore TAB
    if (ev.keyCode === 9) {
      ev.preventDefault();
    }

    if (!input || ev.metaKey || ev.ctrlKey) {
      return;
    }

    this._queryCliqz(input);
  }

  handleInput = () => {

  }

  handleBlur = () => {

  }

  handleFocus = () => {

  }

  handleDragOver = (ev) => {
    ev.stopPropagation();
  }

  handleDrop = (ev) => {
    const dTypes = ev.dataTransfer.types;
    if (dTypes && dTypes.includes('text/plain')) {
      this._queryCliqz(ev.dataTransfer.getData('text'));
    }
  }

  get classes() {
    const { product } = this.props;
    return `search ${product.toLowerCase()}-search`;
  }

  render() {
    return (
      <div
        className={this.classes}
        style={{ ...styles, opacity: this.state.visible }}
      >
        <input
          type="text"
          spellCheck="false"
          ref={(input) => { this.textInput = input; }}
          placeholder={t('urlbar_placeholder')}
          onKeyDown={this.handleKeyDown}
          onKeyPress={this.handleKeyPress}
          onInput={this.handleInput}
          onPaste={this.handlePaste}
          onBlur={this.handleBlur}
          onFocus={this.handleFocus}
          onDragOver={this.handleDragOver}
          onDrop={this.handleDrop}
        />
      </div>
    );
  }
}

export default Urlbar;
