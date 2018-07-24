import React from 'react';

class LanguageSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      listOpen: false,
      selectedLang: this.props.selectedLang
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ selectedLang: nextProps.selectedLang });
  }

  toggleList() {
    this.setState(prevState => ({
      listOpen: !prevState.listOpen
    }));
  }

  handleClickOutside() {
    this.setState({
      listOpen: false
    });
  }

  render() {
    const { list } = this.props;
    const { listOpen, selectedLang } = this.state;
    const filteredList = list.filter(lang => lang !== selectedLang);

    return (
      <aside className="right language-selector">
        <div className="selected-item">
          <a
            role="presentation"
            onClick={() => this.toggleList()}
          >
            <img src={`./images/${selectedLang}.png`} alt="" />
          </a>
        </div>
        {listOpen && <ul>
          {filteredList.map(lang => (
            <li key={lang}>
              <a href={`?lang=${lang}`}>
                <img src={`./images/${lang}.png`} alt="" />
              </a>
            </li>
          ))}
        </ul>}
      </aside>
    );
  }
}

export default LanguageSelector;
