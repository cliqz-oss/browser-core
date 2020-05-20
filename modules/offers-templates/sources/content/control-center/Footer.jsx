import React from 'react';
import send from '../transport';
import { css, i18n, chooseProduct, getUILanguage } from '../utils';

const _css = css('footer__');
function TurnOffRewards(props) {
  if (props.shouldShowOptIn) { return (<div />); }
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div
      onClick={() => {
        props.onClick();
        send('myOffrzTurnoff'); // for partners extensions
        const timeToRead = 4000;
        setTimeout(() => send('hideBanner'), timeToRead);
      }}
      className={_css('left-item', 'turnoff-rewards')}
    >
      {i18n('turnoff_rewards')}
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}

function Feedback(props) {
  const { url } = props;
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div
      className={_css('left-item')}
      onClick={() => {
        send('openURL', { url, closePopup: false });
      }}
    >
      <div className={_css('face')} />
      <div className={_css('space')} />
      <div className={_css('feedback')}>{i18n('feedback_title')}</div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}

export default class Footer extends React.Component {
  state = {
    showNotification: false
  }

  checkClick = () => {
    const { autoTrigger } = this.props;
    this.setState((prevState) => {
      let { clicks = 0 } = prevState;
      if (clicks > 5) {
        const url = chrome.runtime.getURL('/modules/offers-v2/environment/index.html');

        send('openURL', { url, closePopup: true });
        clicks = 0;
        if (!autoTrigger) { window.close(); }
      }

      return { clicks: clicks + 1 };
    });
  }

  render() {
    const { products, autoTrigger, shouldShowOptIn } = this.props;
    const { showNotification } = this.state;
    const lang = getUILanguage() !== 'de' ? 'en/' : '';
    const prefix = chooseProduct(products);
    const feedbackURL = prefix === 'chip'
      ? 'https://sparalarm.chip.de/feedback/'
      : `https://myoffrz.com/${lang}feedback/?p=${prefix}`;

    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <React.Fragment>
        <div
          className={
            _css(
              'container',
              `${autoTrigger ? 'auto' : 'normal'}-trigger-container`,
              `${prefix}-container`
            )
          }
          onClick={this.checkClick}
        >
          {products.ghostery
            ? (
              <TurnOffRewards
                shouldShowOptIn={shouldShowOptIn}
                onClick={() =>
                  this.setState(
                    { showNotification: true },
                    window.__globals_resize
                  )}
              />
            )
            : <Feedback url={feedbackURL} />}
          <div className={_css('right-item')}>
            <span
              title={i18n('powered_by_offrz')}
              className={_css('logo', `${prefix}-logo`)}
              onClick={() => {
                send('openURL', {
                  url: (products.cliqz && `https://cliqz.com/${lang}myoffrz`)
                     || (products.chip && 'https://sparalarm.chip.de/fuer-nutzer')
                     || `https://myoffrz.com/${lang}fuer-nutzer`,
                  closePopup: false,
                });
              }}
            />
          </div>
        </div>
        {showNotification && (
        <div className={_css('notification')}>
          {i18n('turnoff_notification')}
        </div>
        )}
      </React.Fragment>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
