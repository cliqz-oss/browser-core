import React from 'react';
import classNames from 'classnames';
import Storage from '../../../core/storage';
import Dropdown from './dropdown';
import Tooltip from './tooltip';
import alternativeSearchEngines from '../../alternative-engines';
import t from '../services/i18n';

const storage = new Storage();

export default class AlternativeSearchEngines extends React.Component {
  constructor(props = {}) {
    super(props);

    this._session = props.session;
  }

  state = {
    showEnginesDropdown: false,
    showEnginesTooltip: false,
    query: '',
  };

  componentDidMount() {
    const selectedEngine = this._getSelectedEngine();
    this._setSelectedEngine(selectedEngine.title);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.query !== this.state.query) {
      this.setState({
        query: nextProps.query || '',
      });
    }

    if (nextProps.session !== this._session) {
      this._session = nextProps.session;
    }
  }

  engines = [].concat(alternativeSearchEngines);

  _onEngineSelectedHandler = (event, newItemIndex) => {
    event.preventDefault();

    this._setSelectedEngine(
      this.engines[newItemIndex].title
    );
    this._closeEnginesDropdown();
  }

  _closeEnginesDropdown() {
    this.setState({
      showEnginesDropdown: false
    });
  }

  _showEnginesTooltip = () => {
    this.setState({
      showEnginesTooltip: true,
    });
  }

  _hideEnginesTooltip = () => {
    this.setState({
      showEnginesTooltip: false,
    });
  }

  _toggleEnginesDropdown = (prevState) => {
    const shouldShowEnginesDropdown = !prevState.showEnginesDropdown;

    if (shouldShowEnginesDropdown) {
      document.addEventListener('click', this._closeDropdownGlobalHandler);
    }

    this.setState({
      showEnginesDropdown: shouldShowEnginesDropdown
    });

    if (shouldShowEnginesDropdown) {
      this.setState({
        showEnginesTooltip: false,
      });
    }
  }

  _closeDropdownGlobalHandler = () => {
    document.removeEventListener('click', this._closeDropdownGlobalHandler);
    this._closeEnginesDropdown();
  }

  _setSelectedEngine(engineName) {
    let lastSelectedEngine = null;
    let newSelectedEngine = null;

    // If engineName is not provided
    // then let it be the first item in a list by default;
    if (!engineName) {
      newSelectedEngine = this.engines[0];
      newSelectedEngine.checked = true;

      storage.setItem('alternative-search-engine', newSelectedEngine.title);
      return;
    }

    for (let i = 0, l = this.engines.length; i < l; i += 1) {
      if (this.engines[i].checked) {
        lastSelectedEngine = this.engines[i];
      }

      if (this.engines[i].title.toLowerCase() === engineName.toLowerCase()) {
        newSelectedEngine = this.engines[i];
      }
    }

    if (lastSelectedEngine && newSelectedEngine) {
      lastSelectedEngine.checked = false;
      newSelectedEngine.checked = true;

      storage.setItem('alternative-search-engine', newSelectedEngine.title);
    }
  }

  _getSelectedEngine() {
    const selectedEngine = storage.getItem('alternative-search-engine');

    return selectedEngine
      ? this.engines.filter((item) => {
        const res = selectedEngine.toLowerCase() === item.title.toLowerCase();
        return res;
      })[0]
      : this.engines[0];
  }

  _renderEngineSearchCategoryOption(url, title, query, category) {
    if (url) {
      return (
        <a
          className="searchbox-categories-option suggestion"
          href={['//', url, query].join('')}
          target="_blank"
          rel="noreferrer noopener nofollow"
          data-telemetry="search-engine"
          data-engine={this._getSelectedEngine().title.toLowerCase()}
          data-view="results"
          data-category={category}
          data-session={this._session}
        >
          {title}
        </a>
      );
    }

    return null;
  }

  render() {
    const showEnginesDropdown = this.state.showEnginesDropdown;
    const selectedEngine = this._getSelectedEngine();
    const query = this.state.query;
    const showEnginesTooltip = this.state.showEnginesTooltip;

    const cssClass = classNames({
      'searchbox-categories-dropdown-option': true,
      'searchbox-categories-dropdown-option-opened': showEnginesDropdown,
    });

    return (
      <div
        className="searchbox-categories"
      >
        <div
          className="searchbox-categories-dropdown"
        >
          {
            showEnginesTooltip
            && (
              <Tooltip
                text={t('alternative_search_engines')}
              />
            )
          }
          <button
            type="button"
            className={cssClass}
            onClick={this._toggleEnginesDropdown}
            onMouseEnter={this._showEnginesTooltip}
            onMouseLeave={this._hideEnginesTooltip}
          >
            {selectedEngine.title}
          </button>
          {
            showEnginesDropdown
            && (
              <Dropdown
                headerText={t('alternative_search_engines')}
                items={this.engines}
                onItemSelected={this._onEngineSelectedHandler}
              />
            )
          }
        </div>

        {this._renderEngineSearchCategoryOption(selectedEngine.webSearchUrl, t('web'), query, 'web')}
        {this._renderEngineSearchCategoryOption(selectedEngine.imageSearchUrl, t('images'), query, 'pictures')}
        {this._renderEngineSearchCategoryOption(selectedEngine.videoSearchUrl, t('videos'), query, 'videos')}
        {this._renderEngineSearchCategoryOption(selectedEngine.mapSearchUrl, t('maps'), query, 'maps')}
        {this._renderEngineSearchCategoryOption(selectedEngine.newsSearchUrl, t('news'), query, 'news')}
      </div>
    );
  }
}
