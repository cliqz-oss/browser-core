import React from 'react';
import LeftSideBar from './leftside.component';
// import CountDown from './countdown.component';
import GroupStage from './groupstage.component';
import LanguageSelector from './language.component';
import Http from '../services/http';
// import Update from './update.component';
import t from '../services/i18n';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.http = new Http();
    this.state = {
      data: {
        prev: [],
        today: [],
        next: []
      },
      counter: 59,
      languages: [
        'en',
        'de',
        'fr'
      ]
    };
  }

  componentDidMount() {
    clearInterval(this.interval);

    // we set the old data initially for a better experience
    if (localStorage.data) {
      try {
        this.prepareDataAndSetState();
      } catch (err) {
        /* bummer */
      }
    }
    this.update();
    this.updateCounter();
  }
  componentWillUnmount() {
    clearInterval(this.interval);
  }
  // handle click
  handleUpdateClick() {
    this.update();
    this.setState({
      counter: 59
    });
  }
  // Update Counter
  updateCounter() {
    setInterval(() => {
      const counterState = this.state.counter;
      if (counterState === 0) {
        this.update();
        this.setState({
          counter: 59
        });
      } else {
        this.setState({
          counter: counterState - 1,
        });
      }
    }, 1000);
  }
  // Update Content Data
  update() {
    const LANG_MAP = {
      de: 'de',
      fr: 'fr',
      en: 'us'
    };
    // default & fallback
    let lang = 'de';
    let country = 'de';

    try {
      lang = (new URLSearchParams(window.location.search)).get('lang') || lang;
      country = LANG_MAP[lang] || lang;
    } catch (e) { /* bummer */ }

    const putUrl = `https://api.cliqz.com/api/v2/rich-header?path=/v2/map&locale=${lang}&country=${country}`;
    const putData = {
      q: '',
      results: [
        {
          url: 'fifa-world-cup.cliqz.com',
          snippet: {}
        }
      ]
    };

    const getUrl = 'https://api.cliqz.com/api/v1/config';

    Promise
      .all([
        this.http.get(getUrl),
        this.http.put(putUrl, putData)
      ])
      .then((results) => {
        // save data for faster fast load + in case backend is down
        localStorage.data = JSON.stringify(results[1]);
        localStorage.today = results[0].ts;

        this.prepareDataAndSetState();
      });
  }

  prepareDataAndSetState() {
    const data = JSON.parse(localStorage.test_data || localStorage.data);
    const today = localStorage.test_date || localStorage.today;

    const weeks = data.results[0].snippet.extra.weeks;

    let prevDayData;
    let todayData;
    let nextDayData;

    Object.keys(weeks).forEach((key) => {
      if (+key === +today - 1) {
        prevDayData = weeks[key];
      }
      if (key === today) {
        todayData = weeks[today];
      }
      if (+key === +today + 1) {
        nextDayData = weeks[key];
      }
    });

    this.setState({
      data: {
        today: todayData,
        prev: prevDayData,
        next: nextDayData
      }
    });
  }

  selectedLang() {
    let lang = 'de';

    try {
      lang = (new URLSearchParams(window.location.search)).get('lang') || lang;
    } catch (e) { /* bummer */ }
    return lang;
  }

  render() {
    return (
      <div className="page-container">
        {/* <Update update={this.update} /> */}
        <div className="update">
          <span>{ t.next_update } {this.state.counter } s</span>
          <button onClick={() => this.handleUpdateClick()}> <img src="./images/refresh-icon.svg" alt="update" /></button>
        </div>
        <div className="row">
          <LeftSideBar />
          <section id="main-content">
            <div className="content-holder">
              {/* <CountDown /> */}
              <GroupStage data={this.state.data} />
            </div>
          </section>
          <LanguageSelector
            selectedLang={this.selectedLang()}
            list={this.state.languages}
          />
        </div>
      </div>
    );
  }
}

export default App;
