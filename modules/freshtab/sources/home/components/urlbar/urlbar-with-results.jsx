import React from 'react';
import Overlay from '../overlay';
import Urlbar from './index';
import SearchSettings from './search-settings';
import cliqz from '../../cliqz';
import Dropdown from '../../../../core/dropdown/content';

class CliqzTabDropdown extends Dropdown {
  _getUrlbarAttributes() {
    const searchInputStyle = window.getComputedStyle(this.textInput);
    const extraSpace = 22;
    const defaultPadding = 35;

    let padding = (searchInputStyle.paddingLeft && searchInputStyle.paddingLeft.replace('px', ''))
                  || defaultPadding;

    if (padding > 50) {
      padding -= extraSpace;
    }

    return {
      padding,
    };
  }
}

export default class UrlbarWithResults extends Urlbar {
  constructor(props) {
    super(props);
    this.dropdown = new CliqzTabDropdown({
      view: this,
      cliqz,
    });

    this.actions = this.dropdown.actions;
    this.state = {
      ...this.state,
      isSearchSettingsOpen: false,
      iframeHeight: 0,
      isOverlayOpen: false,
    };
  }

  get classes() {
    return [
      super.classes,
      'with-results',
      this.state.iframeHeight !== 0 || this.state.isSearchSettingsOpen ? 'with-dropdown' : '',
    ].join(' ');
  }

  get maxHeight() {
    return window.innerHeight - 140;
  }

  get isDropdownOpen() {
    return this.state.iframeHeight !== 0;
  }

  get isSearchSettingsOpen() {
    return this.state.isSearchSettingsOpen;
  }

  handlePaste = () => {}

  setHeight = (height) => {
    this.setState({
      iframeHeight: Math.min(this.maxHeight, height),
    });
  }

  handleKeyDown = (ev) => {
    if (this.dropdown.onKeydown(ev)) {
      ev.preventDefault();
    }
  }

  handleKeyPress = (ev) => {
    if (this.dropdown.onKeyPress(ev)) {
      ev.preventDefault();
    }
  }

  handleInput = (ev) => {
    if (this.dropdown.onInput(ev)) {
      ev.preventDefault();
    }
  }

  createIframeWrapper = (iframe) => {
    this.dropdown.createIframeWrapper(iframe);
  }

  async componentWillReceiveProps(props) {
    if (props.results === this.props.results ||
      props.results.length === 0) {
      return;
    }

    this.dropdown.render({
      rawResults: props.results
    });
  }

  componentDidUpdate() {
    const shouldShowOverlay = this.isSearchSettingsOpen ||
      this.isDropdownOpen ||
      (this.state.focused && this.textInput && this.textInput.value);

    if (shouldShowOverlay !== this.state.isOverlayOpen) {
      // this setState will not trigger infinite loop because it of the check above
      /* eslint-disable react/no-did-update-set-state */
      this.setState({
        isOverlayOpen: shouldShowOverlay
      });
      /* eslint-enable react/no-did-update-set-state */
    }
  }

  componentWillUnmount() {
    this.dropdown.unload();
  }

  handleFocus = () => {
    this.textInput.select();
    this.setState({
      focused: true,
    });
  }

  handleBlur = () => {
    setTimeout(() => {
      if (this.textInput === document.activeElement) {
        return;
      }
      cliqz.search.stopSearch();
      cliqz.search.resetAssistantStates();

      this.setState({
        iframeHeight: 0,
        focused: false,
      });
    }, 400);
  }

  toggleSettings = () => {
    if (this.isSearchSettingsOpen) {
      this.hideSettings();
    } else {
      this.showSettings();
    }
  }

  closeAll = () => {
    this.setHeight(0);
    this.hideSettings();
  }

  hideSettings = () => {
    this.setState({
      isSearchSettingsOpen: false,
    });
  }

  showSettings = () => {
    this.setState({
      isSearchSettingsOpen: true,
    });
  }

  render() {
    return (
      <div>
        <Overlay
          isOpen={this.state.isOverlayOpen}
          onClick={this.closeAll}
        />
        {super.render()}
        <div className="inner-container">
          <button
            className={`search-settings-btn ${this.state.isSearchSettingsOpen ? 'active' : ''}`}
            tabIndex="-1"
            onClick={this.toggleSettings}
          />
          <div className="results">
            <div id="search-settings" className={`settings-panel ${(this.state.isSearchSettingsOpen ? 'show' : 'hide')}`}>
              <SearchSettings maxHeight={this.maxHeight} isOpen={this.state.isSearchSettingsOpen} />
            </div>
            <iframe
              id="cliqz-dropdown"
              tabIndex="-1"
              title="Results"
              ref={this.createIframeWrapper}
              src="../dropdown/dropdown.html"
              className={`${(this.state.isSearchSettingsOpen ? 'hide' : 'show')}`}
              style={{ height: `${this.state.iframeHeight}px` }}
            />
          </div>
        </div>
      </div>
    );
  }
}
