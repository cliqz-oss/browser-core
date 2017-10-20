import React from 'react';
import cliqz from '../cliqz';
import t from '../i18n';
import { urlBarBlurSignal, urlBarFocusSignal } from '../services/telemetry/urlbar';

const SPECIAL_KEYS = [8, 9, 13, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 91, 224];
const styles = {
  transition: 'all 0.3s ease-in-out'
};

class Urlbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      visible: true
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
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

  handleKeyDown(ev) {
    const value = ev.target.value;
    let input = SPECIAL_KEYS.indexOf(ev.which) > -1 ? '' : ev.key;
    this.setState({
      value,
    });

    if (ev.keyCode === 13) {
      input = value;
    }

    // ignore TAB
    if (ev.keyCode === 9) {
      ev.preventDefault();
    }

    if (!input) {
      return;
    }

    cliqz.core.queryCliqz(input);

    cliqz.core.sendTelemetry({
      type: 'home',
      action: 'search_keystroke'
    });

    setTimeout(() => {
      this.textInput.value = '';
      this.textInput.style.visibility = 'hidden';
    }, 0);
  }

  render() {
    return (
      <div
        className="search"
        style={{ ...styles, opacity: this.state.visible }}
      >
        <input
          type="text"
          ref={(input) => { this.textInput = input; }}
          placeholder={t('urlbar.placeholder')}
          onKeyDown={this.handleKeyDown}
        />
      </div>
    );
  }
}

export default Urlbar;
